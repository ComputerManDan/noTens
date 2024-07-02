const clientId = "4fcecd4693a545d8a6f86cd00daf4f33";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
if (!code) {
      redirectToAuthCodeFlow(clientId);
  } else {
      try {
          const accessToken = await getAccessToken(clientId, code);

          const profile = await fetchProfile(accessToken);
          populateUI(profile);
          const billboard = await fetchBillboard(accessToken)
          displayPlaylist(billboard);
          document.getElementById("searchBar").addEventListener("keypress", async function(event) {
            if (event.key === "Enter") {
              const accSearch = await fetchSearch(accessToken, this.value)
              finSeach(accSearch)
            }
          });
      } catch (error) {
          console.error(error);
          redirectToAuthCodeFlow(clientId);
      }
  }
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
}

export async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("code_verifier", verifier);

  // console.log("Request Params:", params.toString());

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    if (!response.ok) {
        const errorResponse = await response.json();
        console.error('Error response:', errorResponse);
        throw new Error('Failed to obtain access token');
    }

    const responseData = await response.json();
    console.log('Response data:', responseData);
    return responseData.access_token;
} catch (error) {
    console.error('Error in getAccessToken:', error);
    throw error;
}
}
async function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[0]) {
      const profileImage = new Image(200, 200);
      profileImage.src = profile.images[0].url;
      profileImage.style= "border-radius: 50%;";
      document.getElementById("avatar").appendChild(profileImage);
      // document.getElementById("imgUrl").innerText = profile.images[0].url;
  }
  document.getElementById("id").innerText = profile.id;
  // document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
  // document.getElementById("url").innerText = profile.href;
  // document.getElementById("url").setAttribute("href", profile.href);
}

async function fetchBillboard(token) {
  const result = await fetch("https://api.spotify.com/v1/playlists/6UeSakyzhiEt4NB3UAd6NQ", {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  return await result.json();
}
function displayPlaylist(billboard) {
  // console.log(billboard); // for debugging

  if (!billboard || !billboard.tracks || !billboard.tracks.items) {
      console.error("Invalid or empty playlist data");
      return;
  }

  const tracksOverlay = document.getElementById('tracksOverlay');
  const tracksList = document.getElementById('tracksList');

  if (!tracksOverlay || !tracksList) {
      console.error("Tracks overlay elements not found");
      return;
  }

  billboard.tracks.items.forEach((item, index) => {
    if (item.track && item.track.name) {
        // console.log(item.track);

        // Create a div to wrap li and img
        const trackDiv = document.createElement('div');
        trackDiv.id = `track-item-${index}`; // Assign unique ID
        trackDiv.className = 'track-item'; // Assign common class

        // Create list item for track name
        const listItem = document.createElement('li');
        listItem.innerText = `${item.track.album.name} - ${item.track.artists[0].name}`;

        // Create image element for album art
        const listItemImage = document.createElement('img');
        listItemImage.src = item.track.album.images[2].url;

        // Append li and img to the div
        trackDiv.appendChild(listItemImage);
        trackDiv.appendChild(listItem);

        // Append the div to tracksList
        tracksList.appendChild(trackDiv);
    }
});

}

window.closeOverlay= function() {
  document.getElementById('profileOverlay').style.display = 'none';
}
window.closeOverlay2= function() {
  document.getElementById('tracksOverlay').style.display = 'none';
}

window.showMessage = async function(panelName) {
  console.log(panelName);
  if (panelName === 'Profile') {
      document.getElementById('profileOverlay').style.display = 'flex';
} 
else if (panelName === 'billboard'){      
  document.getElementById('tracksOverlay').style.display = 'flex';
}
else {
      alert("You clicked on the " + panelName + " panel.");
  }
};

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  return await result.json();
}

async function fetchSearch(token, query) {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist`;
  const result = await   fetch(url, {
    method: "GET",
    headers: {
        "Authorization": `Bearer ${token}`
    }
  });

  return await result.json();
}

async function finSeach(accSearch) {
  const searchResultsContainer = document.getElementById('searchResultsContainer');
  searchResultsContainer.innerHTML = ''; // Clear previous results

  accSearch.tracks.items.forEach(item => {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'search-result-item';

      // Example: Display track name and artist name
      const trackName = document.createElement('h3');
      trackName.textContent = item.name;
      const artistName = document.createElement('p');
      artistName.textContent = item.artists.map(artist => artist.name).join(', ');

      resultDiv.appendChild(trackName);
      resultDiv.appendChild(artistName);

      searchResultsContainer.appendChild(resultDiv);
  });

  // Make the search results visible
  document.getElementById('searchResults').style.display = 'flex';
}


window.closeSearchResults= function() {
  document.getElementById('searchResults').style.display = 'none';
}