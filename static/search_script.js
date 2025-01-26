function openSearchPage() {
    document.querySelector(".central-container").style.display = "none";
    document.getElementById("searchPage").style.display = "block";
}


// Search function remains unchanged
async function search() {
    const query = document.getElementById("searchInput").value.trim();
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = `<p class="loading-text">Loading results...</p>`;

    if (!query) {
        resultsContainer.innerHTML = `<p>Please enter a search query.</p>`;
        return;
    }

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        displayResults(data, query);
    } catch (error) {
        resultsContainer.innerHTML = `<p>An error occurred: ${error.message}. Please try again later.</p>`;
    }
}

async function displayResults(data, query) {
    const resultsContainer = document.getElementById("results");
    resultsContainer.innerHTML = "";
    document.body.classList.add("blur-background");

    if (data.movie_or_tv && data.movie_or_tv.length > 0) {
        const movieContainer = document.createElement("div");
        movieContainer.classList.add("result-group");
        movieContainer.innerHTML = `<h3>Top Movies or TV Series Results for "${query}"</h3>`;

        data.movie_or_tv.forEach(item => {
            const movieOrTvElement = document.createElement("div");
            movieOrTvElement.classList.add("result-item");
            movieOrTvElement.innerHTML = `
                <a href="javascript:void(0)">
                    <img src="${item.image}" alt="${item.title || item.name}">
                    <p style="color: #000;">${item.title || item.name}</p>
                </a>
            `;

            movieOrTvElement.addEventListener('click', () => showDetails(item));
            movieContainer.appendChild(movieOrTvElement);
        });
        resultsContainer.appendChild(movieContainer);
    } else {
        resultsContainer.innerHTML += `<p>No movie or TV series found for "${query}".</p>`;
    }

    if (data.book && data.book.length > 0) {
        const bookContainer = document.createElement("div");
        bookContainer.classList.add("result-group");
        bookContainer.innerHTML = `<h3>Top Book Results for "${query}"</h3>`;

        data.book.forEach(item => {
            const bookElement = document.createElement("div");
            bookElement.classList.add("result-item");
            bookElement.innerHTML = `
                <a href="javascript:void(0)">
                    <img src="${item.image}" alt="${item.title}">
                    <p style="color: #000;">${item.title}</p>
                </a>
            `;

            bookElement.addEventListener('click', () => showDetails(item));
            bookContainer.appendChild(bookElement);
        });
        resultsContainer.appendChild(bookContainer);
    } else {
        resultsContainer.innerHTML += `<p>No book found for "${query}".</p>`;
    }

    if (!data.movie_or_tv && !data.book) {
        resultsContainer.innerHTML = `<p>No results found for "${query}". Please try again.</p>`;
    }
}

async function showDetails(item) {
    if (!item) {
        console.error("No item data available for display.");
        return;
    }

    // Populating the detail container with the item data
    document.getElementById("detailTitle").textContent = item.title || 'No Title Available';
    document.getElementById("detailDescription").textContent = getShortDescription(item.description || 'No description available', 400);
    document.getElementById("detailReleaseDate").textContent = item.release_date || 'N/A';
    document.getElementById("detailImage").src = item.image || 'No Poster';
    document.getElementById("detailGenres").textContent = item.genres || 'N/A';
    document.getElementById("detailRating").textContent = item.rating || 'N/A';
    document.getElementById("detailLanguage").textContent = item.language || 'N/A';
    document.getElementById("detailProvider").textContent = item.providers || 'N/A';

    // Hide unnecessary sections (director or author)
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
    const modal = document.getElementById("modal")
    detailsContainer.style.backgroundColor = "none";

    if (item.backdrop_path) {
        // If backdrop_path exists, set the background image with a gradient overlay
        detailsContainer.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url(${item.backdrop_path})`;
        detailsContainer.style.backgroundSize = "cover";
        detailsContainer.style.backgroundPosition = "center";
        detailsContainer.style.backgroundRepeat = "no-repeat";
    } else {
        // If backdrop_path does not exist, set a plain white background
        detailsContainer.style.backgroundImage = "";
        modal.style.backgroundColor = "#ffffff";
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

function closeDetails() {
    document.getElementById("detailsContainer").style.display = "none";
    document.body.classList.remove("blur-background");
}
