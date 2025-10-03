const apiKey = "25524d35c27307bff883963bd0c4a175";
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");

const weatherInfo = document.getElementById("weatherInfo");
const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const weatherIcon = document.getElementById("weatherIcon");

const forecastSection = document.getElementById("forecast");
const forecastCards = document.getElementById("forecastCards");
let units = "metric"; // default: Celsius
let unitSymbol = "°C"; // default symbol
// store current location (works for both geolocation + search)
let currentLat = null;
let currentLon = null;



// Fetch weather by city
async function getWeather(city) {
  try {
    const res = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}`
  );

    if (!res.ok) throw new Error("City not found");
    const data = await res.json();
    currentLat = data.coord.lat;
    currentLon = data.coord.lon;

    // Update current weather
    cityName.textContent = data.name;
    temperature.textContent = `🌡 ${data.main.temp}${unitSymbol}`;
    description.textContent = data.weather[0].description;
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    weatherInfo.classList.remove("hidden");

    // Fetch forecast
    getForecast(data.coord.lat, data.coord.lon);
  } catch (err) {
    alert(err.message);
  }
}

// Fetch 5-day forecast
async function getForecast(lat, lon) {
  const res = await fetch(
  `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`
  );
  const data = await res.json();

  forecastCards.innerHTML = ""; // Clear old data

  // Filter forecast: one per day (at noon)
  const daily = data.list.filter(f => f.dt_txt.includes("12:00:00"));

  daily.forEach(day => {
    const card = document.createElement("div");
    card.classList.add("forecast-card");

    card.innerHTML = `
      <p>${new Date(day.dt_txt).toLocaleDateString("en-US", { weekday: "short" })}</p>
      <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="icon">
      <p>${day.main.temp}${unitSymbol}</p> 
    `;

    forecastCards.appendChild(card);
  });

  forecastSection.classList.remove("hidden");
}

// Event listener
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) getWeather(city);
});

// Fetch weather by coordinates (for geolocation)
async function getWeatherByCoords(lat, lon, isGeo = false, resolvedName = null) {
  console.log("Fetching weather for:", lat, lon);
  try {
    const res = await fetch(
  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`
  );
    const data = await res.json();
    console.log("Weather response:", data); 
    currentLat = lat;
    currentLon = lon;

    displayWeather(data,isGeo);     // Show current weather
    getForecast(lat, lon);    // Show forecast
  } catch (err) {
    console.error("Error fetching weather by coords:", err);
    alert("Unable to fetch weather for your location.");
  }
}

// Auto-detect location on load
window.addEventListener("load", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("My location:", latitude, longitude);
        currentLat = latitude;
        currentLon = longitude;

        //  Get real location name from OpenCage
        const locationName = await getLocationName(latitude, longitude);
        console.log("Resolved Location:", locationName);
        cityName.textContent = locationName; 
        

        //  Fetch weather using OpenWeatherMap
        getWeatherByCoords(latitude, longitude, true,locationName);
      },
      () => {
        alert("Location access denied. Please search by city name.");
      }
    );
  } else {
    alert("Geolocation not supported in your browser.");
  }
});


function displayWeather(data, isGeo = false, resolvedName = null) {
  // use opencage result if available
  if (resolvedName) {
    cityName.textContent = resolvedName;
  } else if (!isGeo) {
    cityName.textContent = data.name || "Unknown Location";
  }

  //  Temperature
  temperature.textContent = `🌡 ${data.main.temp}${unitSymbol}`;

  //  Capitalize first letter of each word in description
  description.textContent = data.weather[0].description.replace(/\b\w/g, c => c.toUpperCase());

  //  Weather icon
  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  weatherIcon.alt = data.weather[0].description;

  //  Show the section
  weatherInfo.classList.remove("hidden");

  //  Weather-based background
  const weatherMain = data.weather[0].main.toLowerCase();
  document.body.className = ""; // reset old classes

  if (weatherMain.includes("cloud")) {
    document.body.classList.add("clouds");
  } else if (weatherMain.includes("rain") || weatherMain.includes("drizzle")) {
    document.body.classList.add("rain");
  } else if (weatherMain.includes("snow")) {
    document.body.classList.add("snow");
  } else if (weatherMain.includes("mist") || weatherMain.includes("fog") || weatherMain.includes("haze")) {
    document.body.classList.add("mist");
  } else if (weatherMain.includes("clear")) {
    document.body.classList.add("clear");
  } else {
    document.body.classList.add("sunny"); // default fallback
  }
}


const unitToggle = document.getElementById("unitToggle");

unitToggle.addEventListener("click", () => {
  if (units === "metric") {
    units = "imperial"; 
    unitSymbol = "°F"; //  switch symbol
    unitToggle.textContent = "Switch to °C";
  } else {
    units = "metric"; 
    unitSymbol = "°C"; //  switch symbol
    unitToggle.textContent = "Switch to °F";
  }

  //  Refresh based on coords if available, else by city name
  if (currentLat && currentLon) {
    getWeatherByCoords(currentLat, currentLon, true);
  } else if (cityName.textContent) {
    getWeather(cityName.textContent);
  }
});

// Reverse Geocoding with OpenCage
async function getLocationName(lat, lon) {
  const apiKeyGeo = "f5a73c0d26584998ade630036d47ee44";
  const res = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKeyGeo}`
  );
  const data = await res.json();
  console.log("OpenCage response:", data);

  // Pick the most relevant result
  if (data && data.results && data.results.length > 0) {
    const components = data.results[0].components;

    // Try to pick village/town/city first
    let place =
      components.village ||
      components.town ||
      components.city ||
      components.county ||
      components.state ||
      "Your Location";

    let district = components.state_district || "";
    let country = components.country || "";

    //  return cleaner formatted name
    return `${place}, ${district}, ${country}`.replace(/,\s*$/, "");
  } else {
    return "Your Location";
  }
}




