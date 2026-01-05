import requests
import json
import time
import os
from dotenv import load_dotenv

# Load API Key
load_dotenv()
API_KEY = os.getenv("TMDB_API_KEY")

if not API_KEY:
    raise ValueError("❌ Error: TMDB_API_KEY not found in .env file.")

# Files
INPUT_FILE = os.getenv("MOVIE_LIST_FILE_PATH")
OUTPUT_FILE = os.getenv("ENRICHED_MOVIE_LIST_FILE_PATH")
BASE_URL = "https://api.themoviedb.org/3"

if not API_KEY:
    raise ValueError("❌ Error: TMDB_API_KEY not found in .env file.")

def fetch_enriched_data():
    if not os.path.exists(INPUT_FILE):
         print(f"❌ Error: Input file '{INPUT_FILE}' not found.")
         print("   Please run your initial fetch script first to get the movie list.")
         return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        movies = json.load(f)

    enriched_movies = []
    total_movies = len(movies)
    print(f"🎬 Fetching Genres & Cast for {total_movies} movies...")

    for index, movie in enumerate(movies):
        movie_id = movie['id']
        
        # We use 'append_to_response' to get movie details (genres) AND credits (cast) in one go
        url = f"{BASE_URL}/movie/{movie_id}"
        params = {
            'api_key': API_KEY,
            'append_to_response': 'credits'
        }

        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                
                # 1. Extract Genres
                # data['genres'] is a list like [{'id': 28, 'name': 'Action'}, ...]
                genres = [g['name'] for g in data.get('genres', [])]
                movie['genres'] = genres

                # 2. Extract Cast
                credits = data.get('credits', {})
                cast_list = []
                for cast_member in credits.get('cast', [])[:5]:
                    cast_list.append({
                        'name': cast_member['name'],
                        'character': cast_member['character']
                    })
                movie['cast'] = cast_list
                
                # 3. Ensure Popularity is updated (in case it changed or wasn't there)
                movie['popularity'] = data.get('popularity', movie.get('popularity', 0))
                
                enriched_movies.append(movie)
                
                if (index + 1) % 10 == 0:
                    print(f"✅ Processed {index + 1}/{total_movies}...")
            else:
                print(f"⚠️ Error ID {movie_id}: {response.status_code}")
                # Keep old data if fetch fails
                enriched_movies.append(movie)

            time.sleep(0.15) # Rate limiting

        except Exception as e:
            print(f"❌ Error: {e}")
            enriched_movies.append(movie)

    # Save
    # Ensure directory exists
    output_dir = os.path.dirname(OUTPUT_FILE)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched_movies, f, indent=4)

    print(f"\n🎉 Success! Data with Genres & Cast saved to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    fetch_enriched_data()