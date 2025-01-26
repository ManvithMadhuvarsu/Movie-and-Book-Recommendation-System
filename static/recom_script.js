let allResults = []; // Store all results for filtering by year

// Function to fetch recommendations and display random results
async function searchRecommendations() {
    const query = document.getElementById("searchInput").value.trim();
    const resultsContainer = document.getElementById("results");
    const yearSelector = document.getElementById("yearSelector");

    resultsContainer.innerHTML = `<p class="loading-text">Loading results...</p>`;
    yearSelector.style.display = "none"; // Hide the dropdown initially

    if (!query) {
        resultsContainer.innerHTML = `<p>Please enter a search query.</p>`;
        return;
    }

    // Parse the input (e.g., "Action, Drama - EN")
    const [genreString, language] = query.split(' - ');
    const genres = genreString ? genreString.split(',').map(genre => genre.trim()) : [];

    if (!genres.length || !language) {
        resultsContainer.innerHTML = `<p>Please provide both genres and language (e.g., "Action, Drama - EN").</p>`;
        return;
    }

    try {
        // Fetch recommendations from the API
        const response = await fetch(`/api/recommendations?genres=${encodeURIComponent(genres.join(','))}&language=${encodeURIComponent(language)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        allResults = data.movie_or_tv; // Store results for year filtering
        displayRandomRecommendations(allResults, query);

        // Populate the year selector with unique years from the results
        populateYearSelector(allResults);
        yearSelector.style.display = "block"; // Show the dropdown
    } catch (error) {
        resultsContainer.innerHTML = `<p>An error occurred: ${error.message}. Please try again later.</p>`;
    }
}

// Function to display random 20 results from the full list of fetched results
function displayRandomRecommendations(data, query) {
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";

    // If there are results
    if (data && data.length > 0) {
        // Randomize the results and pick 20 completely random items
        const randomResults = getRandomItems(data, 20);

        const movieContainer = document.createElement("div");
        movieContainer.classList.add("result-group");
        movieContainer.innerHTML = `<h3>Recommended Movies or TV Series for "${query}"</h3>`;

        // Add a container for the movies displayed as a horizontal row
        const movieRow = document.createElement("div");
        movieRow.classList.add("movie-row");

        randomResults.forEach(item => {
            const movieOrTvElement = document.createElement("div");
            movieOrTvElement.classList.add("result-item");
            movieOrTvElement.innerHTML = `
                <a href="javascript:void(0)">
                    <img src="${item.image || 'default-image.jpg'}" alt="${item.title || item.name}">
                    <p>${item.title || item.name}</p>
                </a>
            `;

            // Add click listener to show details
            movieOrTvElement.addEventListener('click', () => showDetails(item));
            movieRow.appendChild(movieOrTvElement);
        });

        movieContainer.appendChild(movieRow);
        resultsContainer.appendChild(movieContainer);
    } else {
        resultsContainer.innerHTML += `<p>No results found for "${query}". Please try again.</p>`;
    }
}

// Function to get random items from an array
function getRandomItems(array, numItems) {
    const shuffledArray = array.slice(); // Create a shallow copy of the array
    const randomItems = [];
    while (randomItems.length < numItems && shuffledArray.length > 0) {
        const randomIndex = Math.floor(Math.random() * shuffledArray.length);
        randomItems.push(shuffledArray.splice(randomIndex, 1)[0]); // Remove the selected item from the array
    }
    return randomItems;
}

// Populate the year selector dropdown
function populateYearSelector(results) {
    const yearSelector = document.getElementById("yearSelector");

    // Extract unique release years from results
    const years = [...new Set(results.map(item => item.release_date?.split('-')[0]).filter(Boolean))].sort((a, b) => b - a);

    // Populate the dropdown
    yearSelector.innerHTML = `<option value="" disabled selected>Select Year</option>`;
    years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelector.appendChild(option);
    });
}

// Filter results by year and display random results
function filterByYear() {
    const selectedYear = document.getElementById("yearSelector").value;
    const filteredResults = allResults.filter(item => item.release_date?.startsWith(selectedYear));
    displayRandomRecommendations(filteredResults, `Selected Year: ${selectedYear}`);
}

// Show details for the selected movie or TV show
async function showDetails(item) {
    if (!item) {
        console.error("No item data available for display.");
        return;
    }

    // Populate the details modal
    document.getElementById("detailTitle").textContent = item.title || 'No Title Available';
    document.getElementById("detailDescription").textContent = getShortDescription (item.description || 'No description available', 400);
    document.getElementById("detailReleaseDate").textContent = item.release_date || 'N/A';
    document.getElementById("detailImage").src = item.image || 'No Poster';
    document.getElementById("detailGenres").textContent = item.genres || 'N/A';
    document.getElementById("detailRating").textContent = item.rating || 'N/A';
    document.getElementById("detailLanguage").textContent = item.language || 'N/A';
    document.getElementById("detailProvider").textContent = item.providers || 'N/A';


    // Update director or author details
    const directorContainer = document.getElementById("directorContainer");
    const authorContainer = document.getElementById("authorContainer");

    if (item.director) {
        directorContainer.style.display = "block";
        document.getElementById("detailDirector").textContent = item.director;
        authorContainer.style.display = "none";
    } else if (item.author) {
        authorContainer.style.display = "block";
        document.getElementById("detailAuthor").textContent = item.author;
        directorContainer.style.display = "none";
    } else {
        directorContainer.style.display = "none";
        authorContainer.style.display = "none";
    }

    // Set modal backdrop using the backdrop_path
    const detailsContainer = document.getElementById("detailsContainer");
    detailsContainer.style.backgroundColor = "none";
    if (item.backdrop_path) {
        detailsContainer.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url(${item.backdrop_path})`;
        detailsContainer.style.backgroundSize = "cover";
        detailsContainer.style.backgroundPosition = "center";
        detailsContainer.style.backgroundRepeat = "no-repeat";
    } else {
        detailsContainer.style.backgroundImage = "";
        detailsContainer.style.backgroundColor = "#ffffff";
    }

    // Show the details modal
    detailsContainer.style.display = "flex"; // Ensure the modal is visible
}

function getShortDescription(description) {
    if (description.length > 400) {
        description = description.substring(0, 400) + "...";  // Add ellipsis at the end
    }
    return description;
}

// Close details modal
function closeDetails() {
    document.getElementById("detailsContainer").style.display = "none";
    document.body.classList.remove("blur-background");
}
