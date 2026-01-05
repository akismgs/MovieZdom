import requests
import time
import json
import os
from dotenv import load_dotenv

# 1. Load environment variables from .env file
load_dotenv()

# 2. Get the API Key safely
API_KEY = os.getenv("TMDB_API_KEY")
print(API_KEY)

if not API_KEY:
    raise ValueError("❌ Error: TMDB_API_KEY not found. Please create a .env file and add your key.")

# CONFIGURATION
BASE_URL = "https://api.themoviedb.org/3"
MOVIES_TO_FETCH = 500
MOVIES_PER_PAGE = 20
OUTPUT_FILE = os.get("MOVIE_LIST_FILE_PATH")

def fetch_movies():
    all_movies = []
    # Calculate how many pages we need (e.g., 500 / 20 = 25 pages)
    total_pages = MOVIES_TO_FETCH // MOVIES_PER_PAGE 
    
    print(f"🎬 Starting download of {MOVIES_TO_FETCH} movies...")

    for page_num in range(1, total_pages + 1):
        try:
            # We use the 'popular' endpoint to ensure we get well-known movies
            url = f"{BASE_URL}/movie/popular"
            params = {
                'api_key': API_KEY,
                'language': 'en-US',
                'page': page_num
            }

            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                movies = data.get('results', [])
                
                # We only need specific fields for trivia, so let's clean the data now
                # to save space.
                for movie in movies:
                    clean_movie = {
                        'id': movie['id'],
                        'title': movie['title'],
                        'release_date': movie.get('release_date', 'N/A'),
                        'overview': movie['overview'], # Useful for "Guess the plot"
                        'popularity': movie['popularity'],
                        'vote_average': movie['vote_average']
                    }
                    all_movies.append(clean_movie)
                
                print(f"✅ Page {page_num}/{total_pages} processed. Total movies: {len(all_movies)}")
                
            else:
                print(f"❌ Error on page {page_num}: {response.status_code} - {response.text}")
                break

            # Respect API Rate Limits (Sleep for 0.2 seconds between requests)
            time.sleep(0.2)
            
        except Exception as e:
            print(f"⚠️ Specific error occurred: {e}")
            break

    # Save to file
    with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
        json.dump(all_movies, f, indent=4)
        
    print(f"\n🎉 Success! {len(all_movies)} movies saved to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    fetch_movies()