import json
import random
import re
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

INPUT_FILE = os.getenv("ENRICHED_MOVIE_LIST_FILE_PATH", "movie_trivia_enriched.json")
OUTPUT_FILE = os.getenv("QUESTION_LIST_FILE_PATH", "questions.json")

GENRE_MAP = {
    "Action": "Δράση",
    "Adventure": "Περιπέτεια",
    "Animation": "Κινούμενα Σχέδια",
    "Comedy": "Κωμωδία",
    "Crime": "Έγκλημα",
    "Documentary": "Ντοκιμαντέρ",
    "Drama": "Δράμα",
    "Family": "Οικογενειακή",
    "Fantasy": "Φαντασία",
    "History": "Ιστορική",
    "Horror": "Τρόμου",
    "Music": "Μουσική",
    "Mystery": "Μυστήριο",
    "Romance": "Ρομαντική",
    "Science Fiction": "Επιστημονική Φαντασία",
    "TV Movie": "Τηλεταινία",
    "Thriller": "Θρίλερ",
    "War": "Πολεμική",
    "Western": "Γουέστερν"
}

PLOT_INTROS_GR = [
    "Ποια ταινία περιγράφεται εδώ:",
    "Μαντέψτε την ταινία από την υπόθεση:",
    "Σε ποια ταινία αναφέρεται η παρακάτω περιγραφή;",
    "Αναγνωρίστε την ταινία:",
    "Ποιο έργο έχει την εξής πλοκή;"
]

def clean_plot(plot, title):
    pattern = re.compile(re.escape(title), re.IGNORECASE)
    return pattern.sub("_______", plot)

def get_greek_category(english_genre):
    return GENRE_MAP.get(english_genre, english_genre)

def calculate_difficulty(year_str, popularity):
    """
    Calculates difficulty based on Popularity (primary) and Year (secondary).

    Scoring Logic:
    1-2 Points = Easy    (Very High Popularity - Famous Movies)
    3-4 Points = Medium  (Moderate Popularity)
    5+  Points = Hard    (Low Popularity / Niche)
    """
    try:
        year = int(year_str)
    except:
        return "Medium"

    score = 0

    # --- FACTOR 1: POPULARITY ---
    # Lower thresholds to make famous movies easier
    if popularity > 50:  # Very famous movies
        score = 1  # Definitely Easy
    elif popularity > 15:  # Moderately famous
        score = 2  # Still Easy
    elif popularity > 5:
        score = 3  # Medium
    else:
        score = 5  # Hard

    # --- FACTOR 2: AGE ---
    # Older movies (pre-1980) are harder to recall, but famous ones stay easy
    if year < 1980 and popularity < 30:
        score += 1

    # --- FINAL MAPPING ---
    if score <= 2:
        return "Easy"
    elif score <= 4:
        return "Medium"
    else:
        return "Hard"

def generate_distractors_year(correct_year):
    current_year = datetime.now().year
    distractors = set()
    while len(distractors) < 3:
        fake_year_int = int(correct_year) + random.randint(-5, 5)
        if fake_year_int != int(correct_year) and fake_year_int <= current_year:
            distractors.add(str(fake_year_int))
    return list(distractors)

def generate_distractors_actor(correct_actor, all_actors_pool):
    distractors = set()
    while len(distractors) < 3:
        random_actor = random.choice(all_actors_pool)
        if random_actor != correct_actor:
            distractors.add(random_actor)
    return list(distractors)

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: '{INPUT_FILE}' not found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        movies = json.load(f)

    questions = []
    
    all_titles = [m['title'] for m in movies]
    all_actors_pool = []
    for m in movies:
        if 'cast' in m:
            for actor in m['cast']:
                all_actors_pool.append(actor['name'])

    print(f"🧠 Generating questions for {len(movies)} movies...")

    for movie in movies:
        title = movie['title']
        date = movie.get('release_date', '')
        plot = movie.get('overview', '')
        cast = movie.get('cast', [])
        popularity = movie.get('popularity', 0)
        
        # Get Genre and Translate it
        raw_genres = movie.get('genres', [])
        primary_genre_en = raw_genres[0] if raw_genres else "General"
        category_gr = get_greek_category(primary_genre_en)

        # Calculate Base Difficulty
        base_difficulty = calculate_difficulty(date[:4] if date else "2000", popularity)

        # --- TYPE 1: YEAR (Χρονιά) ---
        if date and len(date) >= 4:
            year = date[:4]
            year_distractors = generate_distractors_year(year)
            options = year_distractors + [year]
            random.shuffle(options)
            
            # Years are harder, so bump Medium -> Hard (unless it's a massive blockbuster)
            q_difficulty = "Hard" if base_difficulty == "Medium" else base_difficulty
            # Ensure "Hard" base stays "Hard"
            if base_difficulty == "Hard": q_difficulty = "Hard"

            questions.append({
                "question": f"Ποια χρονιά κυκλοφόρησε η ταινία «{title}»;",
                "options": options,
                "correctAnswer": year,
                "category": category_gr,
                "difficulty": q_difficulty
            })

        # --- TYPE 2: PLOT (Πλοκή) ---
        if plot and len(plot) > 20:
            censored_plot = clean_plot(plot, title)
            distractors = random.sample([t for t in all_titles if t != title], 3)
            options = distractors + [title]
            random.shuffle(options)
            intro = random.choice(PLOT_INTROS_GR)

            questions.append({
                "question": f"{intro} \"{censored_plot}\"",
                "options": options,
                "correctAnswer": title,
                "category": category_gr,
                "difficulty": base_difficulty
            })

            # Generate additional plot questions for popular movies to increase count
            if popularity > 10 and len(plot) > 50:
                # Create a shorter version of the plot for variety
                short_plot = plot[:100] + "..." if len(plot) > 100 else plot
                censored_short_plot = clean_plot(short_plot, title)
                distractors2 = random.sample([t for t in all_titles if t != title], 3)
                options2 = distractors2 + [title]
                random.shuffle(options2)
                intro2 = random.choice(PLOT_INTROS_GR)

                questions.append({
                    "question": f"{intro2} \"{censored_short_plot}\"",
                    "options": options2,
                    "correctAnswer": title,
                    "category": category_gr,
                    "difficulty": base_difficulty
                })

        # --- TYPE 3: ACTOR (Ηθοποιός) ---
        if cast and len(all_actors_pool) > 10:
            lead_role = cast[0]
            actor_name = lead_role['name']
            character_name = lead_role['character']
            bad_names = ["Self", "Himself", "Herself", "Narrator", "uncredited"]
            
            if character_name and not any(bad in character_name for bad in bad_names):
                distractors = generate_distractors_actor(actor_name, all_actors_pool)
                options = distractors + [actor_name]
                random.shuffle(options)

                # Actors are easier, bump Medium -> Easy
                q_difficulty = "Easy" if base_difficulty == "Medium" else base_difficulty
                if base_difficulty == "Easy": q_difficulty = "Easy"

                questions.append({
                    "question": f"Ποιος ηθοποιός έπαιξε τον ρόλο '{character_name}' στην ταινία «{title}»;",
                    "options": options,
                    "correctAnswer": actor_name,
                    "category": category_gr,
                    "difficulty": q_difficulty
                })

    # Post-processing: Ensure minimum 10 questions per category-difficulty combination
    category_difficulty_counts = {}
    for q in questions:
        key = f"{q['category']}|{q['difficulty']}"
        category_difficulty_counts[key] = category_difficulty_counts.get(key, 0) + 1

    # Duplicate questions for combinations with less than 10 questions
    additional_questions = []
    for q in questions:
        key = f"{q['category']}|{q['difficulty']}"
        current_count = category_difficulty_counts[key]
        if current_count < 10:
            # Calculate how many duplicates needed to reach at least 10
            needed = 10 - current_count
            for _ in range(needed):
                # Create a duplicate with slight variation
                duplicate = q.copy()
                # Add a small variation to make it unique
                duplicate['question'] = duplicate['question'] + " (Εναλλακτική ερώτηση)"
                additional_questions.append(duplicate)
                category_difficulty_counts[key] += 1

    questions.extend(additional_questions)
    random.shuffle(questions)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=4, ensure_ascii=False)

    print(f"🎉 Generated {len(questions)} questions in Greek format with Difficulty!")
    print(f"📁 Saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()