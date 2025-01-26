import requests
from flask import Flask, render_template, jsonify, request
from genres import GENRE_MAP


app = Flask(__name__)

# Your TMDB and GoogleBooks API keys
TMDB_API_KEY = "ec2fe377ac3bf46e4cece2453133c47e"
GOOGLE_BOOKS_API_KEY = "AIzaSyAwA3CG-G9UZwqIFkXKdmsihB-jIiJrbfE"


@app.route('/')
def index():
    return render_template('home.html')

@app.route('/search')
def search_page():
    return render_template('search.html')

@app.route('/recommendations')
def recommendations_page():
    return render_template('recom.html')

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    genres_input = request.args.get('genres')
    language = request.args.get('language')
    
    if not genres_input or not language:
        return jsonify({'error': 'Both genres and language are required'}), 400

    # Parse genres and language from the input
    genres = parse_genres(genres_input)
    language = language.lower()

    if not genres:
        return jsonify({'error': 'Invalid genres'}), 400

    # Search for movie recommendations using TMDB API
    tmdb_results = search_tmdb_by_genre_and_language(genres, language)

    return jsonify({'movie_or_tv': tmdb_results})

def parse_genres(genres_string):
    """
    Parses the input genres into TMDB genre IDs.
    For example: 'Action, Adventure' becomes [28, 12]
    """
    genres = [genre.strip() for genre in genres_string.split(',')]
    genre_ids = [GENRE_MAP.get(genre) for genre in genres if GENRE_MAP.get(genre)]
    return genre_ids

def search_tmdb_by_genre_and_language(genre_ids, language):
    url = f'https://api.themoviedb.org/3/discover/movie'
    params = {
        'api_key': TMDB_API_KEY,
        'language': 'en-US',
        'page': 1,
        'with_genres': ','.join(map(str, genre_ids)),
        'with_original_language': language,
        'sort_by': 'vote_average.desc',  # Sorting by rating (highest first)
        'vote_count.gte': 50,  # Only show movies with 50+ ratings (optional)
    }
    response = requests.get(url, params=params)
    data = response.json()

    results = []
    for item in data.get('results', []):
        director, genres_str, rating, language, backdrop_path = get_movie_details(item['id'], 'movie')
        watch_providers = get_watch_providers(item['id'])
        results.append({
            'title': item.get('title'),
            'image': f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}",
            'description': item.get('overview'),
            'release_date': item.get('release_date'),
            'director': director,
            'genres': genres_str,
            'rating': rating,
            'language': language,
            'backdrop_path': f"https://image.tmdb.org/t/p/w500{backdrop_path}" if backdrop_path else None,
            'providers' : watch_providers,
        })
    
    return results



@app.route('/api/search')
def search():
    query = request.args.get('query')
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    # Search for movies and TV series using TMDB API
    tmdb_results = search_tmdb(query)
    # Search for books using Google Books API
    google_books_results = search_google_books(query)

    return jsonify({
        'movie_or_tv': tmdb_results,
        'book': google_books_results
    })

def get_movie_details(movie_id, media_type):
    """Fetches director, genre, rating, language, and backdrop details for a movie or TV show."""
    url = f'https://api.themoviedb.org/3/{media_type}/{movie_id}'
    params = {
        'api_key': TMDB_API_KEY,
        'append_to_response': 'credits'
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    # Retrieve director name
    director = 'N/A'
    for crew_member in data.get('credits', {}).get('crew', []):
        if crew_member.get('job') == 'Director':
            director = crew_member.get('name')
            break

    # Retrieve genres
    genres = ', '.join([genre['name'] for genre in data.get('genres', [])])

    # Retrieve rating
    rating = data.get('vote_average', 'N/A')

    # Retrieve language
    language = data.get('original_language', 'N/A').upper()

    # Retrieve backdrop path
    backdrop_path = data.get('backdrop_path', None)
    
    return director, genres, rating, language, backdrop_path

def get_watch_providers(movie_id):
    """
    Fetches the watch providers for a movie by its ID from the TMDB API.
    Returns the first 5 unique providers if available.
    """
    # Construct the correct URL for watch providers
    url = f'https://api.themoviedb.org/3/movie/{movie_id}/watch/providers'
    params = {
        'api_key': TMDB_API_KEY,
    }
    response = requests.get(url, params=params)
    data = response.json()

    providers = []  # Use a list to store providers

    if 'results' in data:
        # Loop through countries and providers to get the flat-rate providers
        for country, country_data in data['results'].items():
            for provider in country_data.get('flatrate', []):
                provider_name = provider['provider_name']
                if provider_name not in providers:  # Avoid duplicates
                    providers.append(provider_name)
                if len(providers) == 5:  # Stop once we have 5 providers
                    break
            if len(providers) == 5:  # Break outer loop if limit is reached
                break

    return providers  # Convert the set back to a list for further use


def search_tmdb(query):
    url = f'https://api.themoviedb.org/3/search/multi'
    params = {
        'api_key': TMDB_API_KEY,
        'query': query,
        'language': 'en-US',
        'page': 1,
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    results = []
    for item in data.get('results', []):
        if item['media_type'] in ['movie', 'tv']:
            director, genres, rating, language, backdrop_path = get_movie_details(item['id'], item['media_type'])
            watch_providers = get_watch_providers(item['id'])
            results.append({
                'title': item.get('title') or item.get('name'),
                'image': f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}",
                'description': item.get('overview'),
                'release_date': item.get('release_date') or item.get('first_air_date'),
                'director': director,
                'genres': genres,
                'rating': rating,
                'language': language,
                'backdrop_path': f"https://image.tmdb.org/t/p/w500{backdrop_path}" if backdrop_path else None,
                'providers' : watch_providers,
            })
    return results


def search_google_books(query):
    url = f'https://www.googleapis.com/books/v1/volumes'
    params = {
        'q': query,
        'key': GOOGLE_BOOKS_API_KEY,
        'maxResults': 20
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    results = []
    for item in data.get('items', []):
        volume_info = item.get('volumeInfo', {})
        results.append({
            'title': volume_info.get('title', 'No title'),
            'image': volume_info.get('imageLinks', {}).get('thumbnail', ''),
            'description': volume_info.get('description', 'No description available'),
            'release_date': volume_info.get('publishedDate', 'N/A'),
            'author': ', '.join(volume_info.get('authors', [])) or 'N/A',
            'genres': ', '.join(volume_info.get('categories', [])) or 'N/A',
            'rating': volume_info.get('averageRating', 'N/A'),
            'language': volume_info.get('language', 'N/A').upper(),
        })
    return results


if __name__ == '__main__':
    app.run(debug=True)
