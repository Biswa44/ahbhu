// Initialize Lucide Icons for beautiful SVG graphics
lucide.createIcons();

// --- USER AUTHENTICATION (EMAIL ONLY, NO PASSWORD, ONE STEP) & GOOGLE SHEETS LINK ---
// Type an email, press "Enter Map":
//   - Known email (already used on this browser) -> logged in immediately.
//   - New email -> registered immediately (no extra fields, no password).
// Either way the overlay closes and the map opens right away.
// Sessions persist per-browser via localStorage, so returning on the same
// device/browser skips the login screen entirely.

var googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxb52MuIjh_cEqZ5wAbzLaniCBe5gmli4CHP1hyne7F5SN5qqgtFXw3FfXjVHbTG3x1/exec';

var authOverlay = document.getElementById('auth-overlay');
var formEmailCheck = document.getElementById('form-email-check');
var checkEmailInput = document.getElementById('check-email');

var profileWidget = document.getElementById('profile-widget');
var profileBtn = document.getElementById('btn-profile');
var profileDropdown = document.getElementById('profile-dropdown');
var profileNameDisplay = document.getElementById('profile-name-display');
var profileEmailDisplay = document.getElementById('profile-email-display');
var btnLogout = document.getElementById('btn-logout');

function getStoredUsers() {
    try {
        return JSON.parse(localStorage.getItem('ahbhu_users') || '[]');
    } catch (err) {
        return [];
    }
}

function saveStoredUsers(users) {
    localStorage.setItem('ahbhu_users', JSON.stringify(users));
}

function showProfileWidget(user) {
    if (!profileWidget) return;
    profileWidget.classList.remove('hidden');
    if (profileNameDisplay) profileNameDisplay.textContent = user.username || user.email;
    if (profileEmailDisplay) profileEmailDisplay.textContent = user.email;
}

function enterApp(user) {
    localStorage.setItem('ahbhu_verified', 'true');
    localStorage.setItem('ahbhu_active_user', user.email);
    if (authOverlay) authOverlay.classList.add('hidden');
    showProfileWidget(user);
}

// Restore a session only for an account already known on this browser.
(function checkPersistentAuth() {
    var storedUsers = getStoredUsers();
    var activeEmail = localStorage.getItem('ahbhu_active_user');
    var activeUser = storedUsers.find(function(user) { return user.email === activeEmail; });

    if (localStorage.getItem('ahbhu_verified') === 'true' && activeUser) {
        if (authOverlay) authOverlay.classList.add('hidden');
        showProfileWidget(activeUser);
    } else {
        localStorage.removeItem('ahbhu_verified');
        localStorage.removeItem('ahbhu_active_user');
    }
})();

// Single step: known email logs in, new email registers - both go straight into the map.
if (formEmailCheck) {
    formEmailCheck.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = checkEmailInput.value.trim().toLowerCase();
        if (!email) return;

        var storedUsers = getStoredUsers();
        var foundUser = storedUsers.find(function(user) { return user.email.toLowerCase() === email; });

        if (foundUser) {
            enterApp(foundUser);
            return;
        }

        // Brand-new email: register automatically, no extra fields required.
        var userDetails = {
            username: email.split('@')[0],
            email: email,
            date: new Date().toLocaleDateString()
        };

        storedUsers.push(userDetails);
        saveStoredUsers(storedUsers);

        // Submit registration details to Google Sheets (fire-and-forget).
        if (googleAppsScriptUrl && googleAppsScriptUrl !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            fetch(googleAppsScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userDetails)
            })
            .then(() => console.log('Synced to Google Sheets!'))
            .catch(err => console.error('Google Sheets Sync failed:', err));
        }

        enterApp(userDetails);
    });
}

// --- PROFILE BUTTON (top-right corner) ---
// Shows the signed-in email/name and lets the user log out.
if (profileBtn) {
    profileBtn.addEventListener('click', function() {
        profileDropdown.classList.toggle('hidden');
    });
}

document.addEventListener('click', function(e) {
    if (profileWidget && !profileWidget.contains(e.target)) {
        profileDropdown.classList.add('hidden');
    }
});

if (btnLogout) {
    btnLogout.addEventListener('click', function() {
        localStorage.removeItem('ahbhu_verified');
        localStorage.removeItem('ahbhu_active_user');
        profileDropdown.classList.add('hidden');
        profileWidget.classList.add('hidden');
        checkEmailInput.value = '';
        authOverlay.classList.remove('hidden');
    });
}


// --- MAP INITIALIZATION & ROTATION ---

var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

var topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map style: &copy; OpenTopoMap'
});

var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Source: Esri'
});

// Transparent street label overlays
var roadsOverlay = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    zIndex: 10
});

// Initialize Map with Rotate plugin
var map = L.map('map', {
    rotate: true,
    zoomControl: false,
    doubleClickZoom: false
}).setView([20, 0], 2);

osmLayer.addTo(map);
L.control.zoom({ position: 'topleft' }).addTo(map);

// Compass widgets bindings
var compassArrow = document.getElementById('compass-arrow');
var compassBearing = document.getElementById('compass-bearing');

map.on('rotate', function() {
    var bearing = map.getBearing();
    compassArrow.style.transform = `rotate(${-bearing}deg)`;
    compassBearing.textContent = `${Math.round(bearing)}°`;
});

document.getElementById('compass-container').addEventListener('click', function() {
    map.setBearing(0);
});


// --- BASEMAPS & ROAD OVERLAYS SWITCH ---

var basemaps = {
    'osm': osmLayer,
    'topo': topoLayer,
    'satellite': satelliteLayer
};

document.querySelectorAll('.basemap-card').forEach(function(card) {
    card.addEventListener('click', function() {
        document.querySelectorAll('.basemap-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        var mapType = card.getAttribute('data-map');
        Object.keys(basemaps).forEach(key => map.removeLayer(basemaps[key]));
        basemaps[mapType].addTo(map);
    });
});

var chkRoadsOverlay = document.getElementById('chk-roads-overlay');
chkRoadsOverlay.addEventListener('change', function() {
    if (chkRoadsOverlay.checked) {
        roadsOverlay.addTo(map);
    } else {
        map.removeLayer(roadsOverlay);
    }
});


// --- OSM FEATURE OVERLAYS (Tile Overlays & Overpass Vector loader) ---

var chkOsmOverlays = document.getElementById('chk-osm-overlays');
var osmSublayersPanel = document.getElementById('osm-sublayers-panel');
var chkOsmRoads = document.getElementById('chk-osm-roads');
var chkOsmRailways = document.getElementById('chk-osm-railways');
var chkOsmWaterways = document.getElementById('chk-osm-waterways');
var chkOsmPonds = document.getElementById('chk-osm-ponds');

// 1. Transparent raster overlays
var railOverlay = L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19,
    zIndex: 9
});

// 2. Vector overlays groups (Waterways & Ponds)
var waterwaysLayerGroup = L.featureGroup().addTo(map);
var pondsLayerGroup = L.featureGroup().addTo(map);

// Enable/Disable sub-options panel
chkOsmOverlays.addEventListener('change', function() {
    if (chkOsmOverlays.checked) {
        osmSublayersPanel.classList.remove('disabled');
        chkOsmRoads.disabled = false;
        chkOsmRailways.disabled = false;
        chkOsmWaterways.disabled = false;
        chkOsmPonds.disabled = false;
        triggerOsmOverlaysQuery();
    } else {
        osmSublayersPanel.classList.add('disabled');
        chkOsmRoads.disabled = true;
        chkOsmRailways.disabled = true;
        chkOsmWaterways.disabled = true;
        chkOsmPonds.disabled = true;
        
        // Remove all overlays
        map.removeLayer(roadsOverlay);
        map.removeLayer(railOverlay);
        waterwaysLayerGroup.clearLayers();
        pondsLayerGroup.clearLayers();
        
        chkOsmRoads.checked = false;
        chkOsmRailways.checked = false;
        chkOsmWaterways.checked = false;
        chkOsmPonds.checked = false;
    }
});

// Sub-overlays switch bindings
chkOsmRoads.addEventListener('change', function() {
    if (chkOsmRoads.checked) roadsOverlay.addTo(map);
    else map.removeLayer(roadsOverlay);
});

chkOsmRailways.addEventListener('change', function() {
    if (chkOsmRailways.checked) railOverlay.addTo(map);
    else map.removeLayer(railOverlay);
});

// Waterways & Ponds trigger query on toggle
chkOsmWaterways.addEventListener('change', triggerOsmOverlaysQuery);
chkOsmPonds.addEventListener('change', triggerOsmOverlaysQuery);

// Fetch vector layers when map view stops panning/zooming
map.on('moveend', function() {
    if (chkOsmOverlays.checked && (chkOsmWaterways.checked || chkOsmPonds.checked)) {
        triggerOsmOverlaysQuery();
    }
});

function triggerOsmOverlaysQuery() {
    var zoom = map.getZoom();
    if (zoom < 13) {
        console.log("Zoom in closer (zoom 13+) to download water/pond vectors.");
        waterwaysLayerGroup.clearLayers();
        pondsLayerGroup.clearLayers();
        return;
    }

    var bounds = map.getBounds();
    var bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

    // A. Query OSM Waterways via Overpass API
    if (chkOsmWaterways.checked) {
        var query = `[out:json][timeout:25];(way["waterway"](${bbox});relation["waterway"](${bbox}););out geom;`;
        fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                waterwaysLayerGroup.clearLayers();
                if (data && data.elements) {
                    data.elements.forEach(element => {
                        if (element.geometry) {
                            var points = element.geometry.map(pt => L.latLng(pt.lat, pt.lon));
                            L.polyline(points, { color: '#0ea5e9', weight: 3, opacity: 0.85 }).addTo(waterwaysLayerGroup);
                        }
                    });
                }
            }).catch(err => console.error("Waterways query error:", err));
    } else {
        waterwaysLayerGroup.clearLayers();
    }

    // B. Query OSM Ponds/Lakes
    if (chkOsmPonds.checked) {
        var query = `[out:json][timeout:25];(way["natural"="water"](${bbox});way["landuse"="reservoir"](${bbox}););out geom;`;
        fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                pondsLayerGroup.clearLayers();
                if (data && data.elements) {
                    data.elements.forEach(element => {
                        if (element.geometry) {
                            var points = element.geometry.map(pt => L.latLng(pt.lat, pt.lon));
                            L.polygon(points, { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.4, weight: 1.5 }).addTo(pondsLayerGroup);
                        }
                    });
                }
            }).catch(err => console.error("Ponds query error:", err));
    } else {
        pondsLayerGroup.clearLayers();
    }
}


// --- DYNAMIC REGIONAL BOUNDARIES SELECTOR ---

var selectRegion = document.getElementById('select-reg-region');
var btnApplyRegion = document.getElementById('btn-apply-region');
var btnClearRegion = document.getElementById('btn-clear-region');

var regionBoundaryLayer = null;
var regionManagedLayer = null;
var regionOptions = [];

// Fetch worldwide Countries and States JSON database on start
(function fetchCountriesAndStates() {
    fetch('https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/countries%2Bstates.json')
        .then(res => res.json())
        .then(data => {
            regionOptions = [];
            data.forEach(c => {
                regionOptions.push({ name: c.name, type: 'Country' });
                if (c.states) {
                    c.states.forEach(s => {
                        regionOptions.push({ name: s.name, type: 'State', country: c.name });
                    });
                }
            });

            // Sort options alphabetically
            regionOptions.sort((a, b) => a.name.localeCompare(b.name));

            selectRegion.innerHTML = '<option value="">-- Choose Country or State --</option>';
            regionOptions.forEach(r => {
                var opt = document.createElement('option');
                opt.value = r.name;
                opt.textContent = `${r.name} (${r.type === 'State' ? 'State, ' + r.country : 'Country'})`;
                selectRegion.appendChild(opt);
            });
        })
        .catch(err => {
            console.error("Failed to load country-state database, using fallback country list:", err);
            var fallbackCountries = ["India", "United States", "United Kingdom", "Canada", "Australia", "Bangladesh", "Germany", "France", "Brazil", "South Africa"];
            selectRegion.innerHTML = '<option value="">-- Choose Country or State --</option>';
            fallbackCountries.forEach(c => {
                var opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                selectRegion.appendChild(opt);
            });
        });
})();

// Apply Boundary Outline (Bold outer boundary outline, no pin or popup in the middle)
btnApplyRegion.addEventListener('click', function() {
    var regionName = selectRegion.value;
    if (!regionName) {
        alert("Please select a country or state!");
        return;
    }

    btnApplyRegion.innerHTML = '<i class="animate-spin" data-lucide="loader-2"></i> Querying...';
    lucide.createIcons();

    var url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(regionName)}&polygon_geojson=1&format=jsonv2&limit=1`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            btnApplyRegion.innerHTML = '<i data-lucide="search"></i> Locate';
            lucide.createIcons();

            if (data && data.length > 0) {
                var result = data[0];
                if (regionBoundaryLayer && regionManagedLayer) {
                    regionManagedLayer.layerGroup.removeLayer(regionBoundaryLayer);
                }
                regionManagedLayer = getOrCreateManagedLayer('layer_region_boundary', 'Region Boundary', 'Polygon', '#6d5dfc');

                // Style: bold outer border line, transparent inside, NO popup or center marker pin
                regionBoundaryLayer = L.geoJSON(result.geojson, {
                    style: {
                        color: '#6d5dfc',
                        weight: 5, // Bold border
                        fillColor: '#6d5dfc',
                        fillOpacity: 0.0, // Fully transparent inside to see base map tiles
                        dashArray: 'none' // Solid line
                    }
                }).addTo(regionManagedLayer.layerGroup);

                if (result.boundingbox) {
                    var bbox = result.boundingbox;
                    var bounds = L.latLngBounds(
                        [parseFloat(bbox[0]), parseFloat(bbox[2])],
                        [parseFloat(bbox[1]), parseFloat(bbox[3])]
                    );
                    map.fitBounds(bounds, { padding: [40, 40] }); // Centers and fits map window
                } else if (result.lat && result.lon) {
                    map.setView([parseFloat(result.lat), parseFloat(result.lon)], 11);
                }
            } else {
                alert("Could not locate boundary geometry.");
            }
        })
        .catch(err => {
            console.error(err);
            btnApplyRegion.innerHTML = '<i data-lucide="search"></i> Locate';
            lucide.createIcons();
            alert("Error querying boundary.");
        });
});

btnClearRegion.addEventListener('click', function() {
    if (regionBoundaryLayer) {
        if (regionManagedLayer) regionManagedLayer.layerGroup.removeLayer(regionBoundaryLayer);
        regionBoundaryLayer = null;
    }
    selectRegion.value = '';
});


// --- DYNAMIC LEFT SIDEBAR LAYER MANAGER ---

var gisLayers = [
    {
        id: 'layer_points',
        name: 'Points Layer',
        type: 'Point',
        color: '#6d5dfc',
        visible: true,
        customFields: [],
        styleSettings: { pointRadius: 8 },
        layerGroup: L.featureGroup().addTo(map)
    },
    {
        id: 'layer_lines',
        name: 'Lines Layer',
        type: 'Line',
        color: '#10b981',
        visible: true,
        customFields: [],
        styleSettings: { weight: 4, dashArray: 'none' },
        layerGroup: L.featureGroup().addTo(map)
    },
    {
        id: 'layer_polygons',
        name: 'Polygons Layer',
        type: 'Polygon',
        color: '#f59e0b',
        visible: true,
        customFields: [],
        styleSettings: { weight: 3, fillOpacity: 0.35, dashArray: 'none' },
        layerGroup: L.featureGroup().addTo(map)
    }
];

var activeTargetLayerId = 'layer_points';
var layerListContainer = document.getElementById('layer-list-container');
var inputNewLayer = document.getElementById('input-new-layer');
var selectNewLayerType = document.getElementById('select-new-layer-type');
var btnAddLayer = document.getElementById('btn-add-layer');

function renderLayers() {
    layerListContainer.innerHTML = '';
    
    // Clear and rebuild the extract layer selector with every managed map layer.
    var selectExtractBounds = document.getElementById('select-extract-bounds');
    var selectedExtractLayerId = selectExtractBounds.value;
    selectExtractBounds.innerHTML = '';

    gisLayers.forEach(function(layer) {
        var opt = document.createElement('option');
        opt.value = layer.id;
        opt.textContent = `${layer.name} (${layer.type})`;
        opt.selected = layer.id === selectedExtractLayerId;
        selectExtractBounds.appendChild(opt);

        var card = document.createElement('div');
        card.className = 'layer-card';
        if (layer.id === activeTargetLayerId) {
            card.classList.add('target-active');
        }

        // Render card
        card.innerHTML = `
            <div class="layer-card-top">
                <div class="layer-toggle-grp">
                    <input type="checkbox" class="layer-checkbox" ${layer.visible ? 'checked' : ''} />
                    <input type="text" class="layer-name-input" value="${layer.name}" />
                    <span class="layer-badge-icon">${layer.type}</span>
                </div>
                <input type="color" class="layer-color-picker" value="${layer.color}" />
            </div>
            
            <button class="layer-style-settings-toggle"><i data-lucide="sliders"></i> Style Options</button>
            
            <div class="layer-style-panel hidden" id="style-panel-${layer.id}">
                ${layer.type === 'Point' ? `
                    <div class="style-row">
                        <span>Marker Size:</span>
                        <input type="range" class="style-point-radius" min="4" max="24" value="${layer.styleSettings.pointRadius || 8}" />
                    </div>
                ` : ''}
                ${layer.type === 'Line' || layer.type === 'Polygon' ? `
                    <div class="style-row">
                        <span>Line Weight:</span>
                        <input type="range" class="style-line-weight" min="1" max="10" value="${layer.styleSettings.weight || 3}" />
                    </div>
                    <div class="style-row">
                        <span>Border Style:</span>
                        <select class="style-line-dash">
                            <option value="none" ${layer.styleSettings.dashArray === 'none' ? 'selected' : ''}>Solid</option>
                            <option value="5, 5" ${layer.styleSettings.dashArray === '5, 5' ? 'selected' : ''}>Dashed</option>
                            <option value="2, 5" ${layer.styleSettings.dashArray === '2, 5' ? 'selected' : ''}>Dotted</option>
                        </select>
                    </div>
                ` : ''}
                ${layer.type === 'Polygon' ? `
                    <div class="style-row">
                        <span>Fill Opacity:</span>
                        <input type="range" class="style-fill-opacity" min="0" max="1" step="0.1" value="${layer.styleSettings.fillOpacity !== undefined ? layer.styleSettings.fillOpacity : 0.3}" />
                    </div>
                ` : ''}
            </div>

            <div class="layer-card-bottom">
                <button class="target-select-btn ${layer.id === activeTargetLayerId ? 'active' : ''}">
                    ${layer.id === activeTargetLayerId ? 'Active Target' : 'Set Active'}
                </button>
                <div class="layer-action-buttons">
                    <button class="layer-action-btn open-table" title="Open Attribute Table"><i data-lucide="table"></i></button>
                    <button class="layer-action-btn export" title="Download KML File"><i data-lucide="download"></i></button>
                    <button class="layer-action-btn delete" title="Delete Layer"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;

        // Style Expand Button Handler
        var toggleStyleBtn = card.querySelector('.layer-style-settings-toggle');
        var stylePanel = card.querySelector(`#style-panel-${layer.id}`);
        toggleStyleBtn.addEventListener('click', function() {
            stylePanel.classList.toggle('hidden');
        });

        // Live Styling Events
        var colorPicker = card.querySelector('.layer-color-picker');
        colorPicker.addEventListener('input', function() {
            layer.color = colorPicker.value;
            applyLayerStyles(layer);
        });

        if (layer.type === 'Point') {
            var radSlider = card.querySelector('.style-point-radius');
            radSlider.addEventListener('input', function() {
                layer.styleSettings.pointRadius = parseInt(radSlider.value);
                applyLayerStyles(layer);
            });
        }
        if (layer.type === 'Line' || layer.type === 'Polygon') {
            var weightSlider = card.querySelector('.style-line-weight');
            var dashSelect = card.querySelector('.style-line-dash');
            
            weightSlider.addEventListener('input', function() {
                layer.styleSettings.weight = parseInt(weightSlider.value);
                applyLayerStyles(layer);
            });
            dashSelect.addEventListener('change', function() {
                layer.styleSettings.dashArray = dashSelect.value;
                applyLayerStyles(layer);
            });
        }
        if (layer.type === 'Polygon') {
            var opSlider = card.querySelector('.style-fill-opacity');
            opSlider.addEventListener('input', function() {
                layer.styleSettings.fillOpacity = parseFloat(opSlider.value);
                applyLayerStyles(layer);
            });
        }

        // Layer actions
        var checkbox = card.querySelector('.layer-checkbox');
        checkbox.addEventListener('change', function() {
            layer.visible = checkbox.checked;
            if (layer.visible) layer.layerGroup.addTo(map);
            else map.removeLayer(layer.layerGroup);
        });

        var nameInput = card.querySelector('.layer-name-input');
        nameInput.addEventListener('change', function() {
            layer.name = nameInput.value;
            if (currentTableLayerId === layer.id) {
                document.getElementById('attr-table-title').textContent = `Attribute Table: ${layer.name}`;
            }
            renderLayers();
        });

        card.querySelector('.target-select-btn').addEventListener('click', function() {
            activeTargetLayerId = layer.id;
            setDrawingToolToMatchLayer(layer.type);
            renderLayers();
        });

        card.querySelector('.open-table').addEventListener('click', function() {
            openAttributeTable(layer);
        });

        // Dynamic Download triggers KML download format instead of GeoJSON
        card.querySelector('.export').addEventListener('click', function() {
            exportLayer(layer, 'kml');
        });

        card.querySelector('.delete').addEventListener('click', function() {
            if (confirm(`Are you sure you want to delete ${layer.name}?`)) {
                map.removeLayer(layer.layerGroup);
                gisLayers = gisLayers.filter(l => l.id !== layer.id);
                if (activeTargetLayerId === layer.id) activeTargetLayerId = 'layer_points';
                renderLayers();
                if (currentTableLayerId === layer.id) closeTablePanel();
            }
        });

        layerListContainer.appendChild(card);
    });

    // Handle the empty layer-selector state.
    if (selectExtractBounds.options.length === 0) {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '-- No Layers Found --';
        selectExtractBounds.appendChild(opt);
    }

    lucide.createIcons();
}

function getOrCreateManagedLayer(id, name, type, color) {
    var existingLayer = gisLayers.find(layer => layer.id === id);
    if (existingLayer) return existingLayer;

    var styleSettings = type === 'Point'
        ? { pointRadius: 8 }
        : (type === 'Line'
            ? { weight: 4, dashArray: 'none' }
            : { weight: 3, fillOpacity: 0.35, dashArray: 'none' });
    var managedLayer = {
        id: id,
        name: name,
        type: type,
        color: color,
        visible: true,
        customFields: [],
        styleSettings: styleSettings,
        layerGroup: L.featureGroup().addTo(map)
    };
    gisLayers.push(managedLayer);
    renderLayers();
    return managedLayer;
}

btnAddLayer.addEventListener('click', function() {
    var name = inputNewLayer.value.trim();
    var type = selectNewLayerType.value;
    if (!name) return;

    var newId = 'layer_' + Date.now();
    var randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

    gisLayers.push({
        id: newId,
        name: name,
        type: type,
        color: randomColor,
        visible: true,
        customFields: [],
        styleSettings: type === 'Point' ? { pointRadius: 8 } : (type === 'Line' ? { weight: 4, dashArray: 'none' } : { weight: 3, fillOpacity: 0.35, dashArray: 'none' }),
        layerGroup: L.featureGroup().addTo(map)
    });

    inputNewLayer.value = '';
    renderLayers();
});

function setDrawingToolToMatchLayer(type) {
    if (type === 'Point') setTool('point');
    else if (type === 'Line') setTool('line');
    else if (type === 'Polygon') setTool('polygon');
}

function applyLayerStyles(layer) {
    layer.layerGroup.eachLayer(function(child) {
        if (child instanceof L.CircleMarker) {
            child.setStyle({
                color: '#ffffff',
                fillColor: layer.color,
                fillOpacity: 0.85,
                radius: layer.styleSettings.pointRadius || 8
            });
        } else if (child.setStyle) {
            var options = {
                color: layer.color,
                weight: layer.styleSettings.weight || 3,
                dashArray: layer.styleSettings.dashArray || 'none'
            };
            if (layer.type === 'Polygon') {
                options.fillColor = layer.color;
                options.fillOpacity = layer.styleSettings.fillOpacity !== undefined ? layer.styleSettings.fillOpacity : 0.3;
            }
            child.setStyle(options);
        }
    });
}


// --- INTERACTIVE DRAWING SYSTEM (POINT, LINE, POLYGON, RECTANGLE, INFO) ---

var currentTool = null; // 'point', 'line', 'polygon', 'rectangle', 'info'
var tempPoints = [];
var rubberBandLine = null;
var rubberBandPolygon = null;
var rectStartLatLng = null;

var tempLayerGroup = L.layerGroup().addTo(map);

var btnPoint = document.getElementById('btn-point');
var btnLine = document.getElementById('btn-line');
var btnPolygon = document.getElementById('btn-polygon');
var btnRectangle = document.getElementById('btn-rectangle');
var btnInfo = document.getElementById('btn-info');
var btnFinish = document.getElementById('btn-finish');
var btnClear = document.getElementById('btn-clear');

var lastMeasuredType = 'None';
var lastMeasuredValue = 0;

function setTool(toolName) {
    resetActiveToolUI();
    cancelDrawing();
    
    currentTool = toolName;
    if (toolName === null) {
        map.getContainer().classList.remove('cursor-crosshair');
        return;
    }

    var activeLayer = gisLayers.find(l => l.id === activeTargetLayerId);
    
    if (toolName === 'point' && (!activeLayer || activeLayer.type !== 'Point')) {
        var ptL = gisLayers.find(l => l.type === 'Point');
        if (ptL) {
            activeTargetLayerId = ptL.id;
            renderLayers();
        }
    } else if (toolName === 'line' && (!activeLayer || activeLayer.type !== 'Line')) {
        var lnL = gisLayers.find(l => l.type === 'Line');
        if (lnL) {
            activeTargetLayerId = lnL.id;
            renderLayers();
        }
    } else if ((toolName === 'polygon' || toolName === 'rectangle') && (!activeLayer || activeLayer.type !== 'Polygon')) {
        var polyL = gisLayers.find(l => l.type === 'Polygon');
        if (polyL) {
            activeTargetLayerId = polyL.id;
            renderLayers();
        }
    }

    activeLayer = gisLayers.find(l => l.id === activeTargetLayerId);

    if (toolName === 'point') btnPoint.classList.add('active');
    else if (toolName === 'line') btnLine.classList.add('active');
    else if (toolName === 'polygon') btnPolygon.classList.add('active');
    else if (toolName === 'rectangle') btnRectangle.classList.add('active');
    else if (toolName === 'info') btnInfo.classList.add('active');

    map.getContainer().classList.add('cursor-crosshair');

    if (toolName === 'line' || toolName === 'polygon') {
        btnFinish.classList.remove('hidden');
    } else {
        btnFinish.classList.add('hidden');
    }

    if (toolName === 'info') {
        document.getElementById('info-panel').classList.remove('hidden');
    } else {
        document.getElementById('info-panel').classList.add('hidden');
    }
}

function resetActiveToolUI() {
    btnPoint.classList.remove('active');
    btnLine.classList.remove('active');
    btnPolygon.classList.remove('active');
    btnRectangle.classList.remove('active');
    btnInfo.classList.remove('active');
}

btnPoint.addEventListener('click', () => setTool(currentTool === 'point' ? null : 'point'));
btnLine.addEventListener('click', () => setTool(currentTool === 'line' ? null : 'line'));
btnPolygon.addEventListener('click', () => setTool(currentTool === 'polygon' ? null : 'polygon'));
btnRectangle.addEventListener('click', () => setTool(currentTool === 'rectangle' ? null : 'rectangle'));
btnInfo.addEventListener('click', () => setTool(currentTool === 'info' ? null : 'info'));
btnFinish.addEventListener('click', finishDrawing);

function cancelDrawing() {
    tempPoints = [];
    rectStartLatLng = null;
    tempLayerGroup.clearLayers();
    rubberBandLine = null;
    rubberBandPolygon = null;
    btnFinish.classList.add('hidden');
}

btnClear.addEventListener('click', function() {
    if (confirm("Are you sure you want to clear all drawn vectors off the map?")) {
        if (gpsWatchId !== null) stopGpsTracking();
        gisLayers.forEach(l => l.layerGroup.clearLayers());
        activeInfoMarker = null;
        regionBoundaryLayer = null;
        cancelDrawing();
        resetMeasurementPanel();
        if (currentTableLayerId) {
            var layer = gisLayers.find(l => l.id === currentTableLayerId);
            if (layer) renderAttributeTable(layer);
        }
    }
});


// --- CONTAINER-LEVEL CLICK INTERCEPTOR (LEAFLET-ROTATE CLICK SOLVED) ---

var isMouseDown = false;
var mouseDownPos = { x: 0, y: 0 };
var wasDragging = false;

map.getContainer().addEventListener('mousedown', function(e) {
    isMouseDown = true;
    mouseDownPos = { x: e.clientX, y: e.clientY };
    wasDragging = false;
});

map.getContainer().addEventListener('mouseup', function(e) {
    isMouseDown = false;
});

map.getContainer().addEventListener('mousemove', function(e) {
    if (isMouseDown) {
        var dx = e.clientX - mouseDownPos.x;
        var dy = e.clientY - mouseDownPos.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
            wasDragging = true;
        }
    }
});

map.getContainer().addEventListener('click', function(e) {
    if (!currentTool || wasDragging) return;

    if (
        e.target.closest('.leaflet-control') ||
        e.target.closest('.sidebar') ||
        e.target.closest('.attribute-table-container') ||
        e.target.closest('.calculator-modal') ||
        e.target.closest('.add-field-modal') ||
        e.target.closest('.dev-modal') ||
        e.target.closest('.auth-overlay') ||
        e.target.closest('.profile-widget')
    ) {
        return;
    }

    var latlng = map.mouseEventToLatLng(e);
    handleMapDrawingClick(latlng);
});

function handleMapDrawingClick(latlng) {
    var activeLayer = gisLayers.find(l => l.id === activeTargetLayerId);
    if (!activeLayer) return;
    var color = activeLayer.color;

    if (currentTool === 'point') {
        var pt = L.circleMarker(latlng, {
            radius: activeLayer.styleSettings.pointRadius || 8,
            color: '#ffffff',
            fillColor: color,
            fillOpacity: 0.85,
            weight: 2
        }).addTo(activeLayer.layerGroup);

        pt.attributes = {};
        pt.centroid = latlng;
        bindSelectionPopup(pt, 'Point', activeLayer);

        lastMeasuredType = 'Point';
        lastMeasuredValue = latlng;
        updateMeasurementUI();
        refreshAttributeTableIfOpen(activeLayer);
        setTool(null);
    }
    else if (currentTool === 'line') {
        tempPoints.push(latlng);
        L.circleMarker(latlng, { radius: 4, color: color, fillColor: '#fff', fillOpacity: 1 }).addTo(tempLayerGroup);
        if (tempPoints.length > 1) {
            L.polyline(tempPoints, { color: color, weight: 3 }).addTo(tempLayerGroup);
        }
    }
    else if (currentTool === 'polygon') {
        tempPoints.push(latlng);
        L.circleMarker(latlng, { radius: 4, color: color, fillColor: '#fff', fillOpacity: 1 }).addTo(tempLayerGroup);
        if (tempPoints.length > 1) {
            L.polyline(tempPoints, { color: color, weight: 2 }).addTo(tempLayerGroup);
        }
    }
    else if (currentTool === 'rectangle') {
        if (!rectStartLatLng) {
            rectStartLatLng = latlng;
            L.circleMarker(latlng, { radius: 4, color: color, fillColor: '#fff', fillOpacity: 1 }).addTo(tempLayerGroup);
        } else {
            var rectBounds = [rectStartLatLng, latlng];
            var rect = L.rectangle(rectBounds, {
                color: color,
                weight: activeLayer.styleSettings.weight || 3,
                fillColor: color,
                fillOpacity: activeLayer.styleSettings.fillOpacity || 0.35,
                dashArray: activeLayer.styleSettings.dashArray || 'none'
            }).addTo(activeLayer.layerGroup);

            rect.attributes = {};
            rect.centroid = L.latLngBounds(rectBounds).getCenter();
            
            var corners = rect.getLatLngs()[0];
            rect.calculatedArea = calculatePolygonArea(corners);
            
            bindSelectionPopup(rect, 'Polygon', activeLayer);

            lastMeasuredType = 'Polygon';
            lastMeasuredValue = rect.calculatedArea;
            updateMeasurementUI();
            refreshAttributeTableIfOpen(activeLayer);
            setTool(null);
        }
    }
    else if (currentTool === 'info') {
        queryLocationDetails(latlng);
    }
}

map.on('mousemove', function(e) {
    if (!currentTool) return;
    var cursor = e.latlng;
    var activeLayer = gisLayers.find(l => l.id === activeTargetLayerId);
    if (!activeLayer) return;
    var color = activeLayer.color;

    if (currentTool === 'line' && tempPoints.length > 0) {
        var lineCoords = [tempPoints[tempPoints.length - 1], cursor];
        if (!rubberBandLine) {
            rubberBandLine = L.polyline(lineCoords, { color: color, weight: 2, dashArray: '5, 5' }).addTo(tempLayerGroup);
        } else {
            rubberBandLine.setLatLngs(lineCoords);
        }
    } 
    else if (currentTool === 'polygon' && tempPoints.length > 0) {
        if (tempPoints.length === 1) {
            var lineCoords = [tempPoints[0], cursor];
            if (!rubberBandLine) {
                rubberBandLine = L.polyline(lineCoords, { color: color, weight: 2, dashArray: '5, 5' }).addTo(tempLayerGroup);
            } else {
                rubberBandLine.setLatLngs(lineCoords);
            }
        } else if (tempPoints.length > 1) {
            if (rubberBandLine) {
                tempLayerGroup.removeLayer(rubberBandLine);
                rubberBandLine = null;
            }
            var polyCoords = [...tempPoints, cursor];
            if (!rubberBandPolygon) {
                rubberBandPolygon = L.polygon(polyCoords, { color: color, fillColor: color, fillOpacity: 0.1, weight: 2, dashArray: '5, 5' }).addTo(tempLayerGroup);
            } else {
                rubberBandPolygon.setLatLngs(polyCoords);
            }
        }
    }
    else if (currentTool === 'rectangle' && rectStartLatLng) {
        var rectBounds = [rectStartLatLng, cursor];
        if (!rubberBandPolygon) {
            rubberBandPolygon = L.rectangle(rectBounds, { color: color, fillOpacity: 0.1, weight: 2, dashArray: '5, 5' }).addTo(tempLayerGroup);
        } else {
            rubberBandPolygon.setBounds(rectBounds);
        }
    }
});

map.on('dblclick', function() {
    if (currentTool === 'line' || currentTool === 'polygon') finishDrawing();
});

function finishDrawing() {
    if (tempPoints.length === 0) return;
    var activeLayer = gisLayers.find(l => l.id === activeTargetLayerId);
    if (!activeLayer) return;
    var color = activeLayer.color;

    if (currentTool === 'line') {
        if (tempPoints.length < 2) return;
        var line = L.polyline(tempPoints, {
            color: color,
            weight: activeLayer.styleSettings.weight || 4,
            dashArray: activeLayer.styleSettings.dashArray || 'none'
        }).addTo(activeLayer.layerGroup);

        line.attributes = {};
        line.centroid = tempPoints[Math.floor(tempPoints.length / 2)];
        line.calculatedLength = calculateLineLength(tempPoints);
        bindSelectionPopup(line, 'Line', activeLayer);

        lastMeasuredType = 'Line';
        lastMeasuredValue = line.calculatedLength;
        updateMeasurementUI();
        refreshAttributeTableIfOpen(activeLayer);
    } 
    else if (currentTool === 'polygon') {
        if (tempPoints.length < 3) return;
        var polygon = L.polygon(tempPoints, {
            color: color,
            weight: activeLayer.styleSettings.weight || 3,
            fillColor: color,
            fillOpacity: activeLayer.styleSettings.fillOpacity || 0.35,
            dashArray: activeLayer.styleSettings.dashArray || 'none'
        }).addTo(activeLayer.layerGroup);

        polygon.attributes = {};
        polygon.centroid = polygon.getBounds().getCenter();
        polygon.calculatedArea = calculatePolygonArea(tempPoints);
        bindSelectionPopup(polygon, 'Polygon', activeLayer);

        lastMeasuredType = 'Polygon';
        lastMeasuredValue = polygon.calculatedArea;
        updateMeasurementUI();
        refreshAttributeTableIfOpen(activeLayer);
    }

    setTool(null);
}

function bindSelectionPopup(feature, type, layer) {
    feature.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        
        var latStr = feature.centroid.lat.toFixed(5);
        var lngStr = feature.centroid.lng.toFixed(5);
        var detailsHtml = `<b>Type:</b> ${type}<br><b>Centroid:</b> ${latStr}, ${lngStr}`;
        
        if (type === 'Line' && feature.calculatedLength) {
            detailsHtml += `<br><b>Length:</b> ${formatLength(feature.calculatedLength, 'm')}`;
        } else if (type === 'Polygon' && feature.calculatedArea) {
            detailsHtml += `<br><b>Area:</b> ${formatArea(feature.calculatedArea, 'sqm')}`;
        }

        if (feature.attributes) {
            Object.keys(feature.attributes).forEach(key => {
                detailsHtml += `<br><b>${key}:</b> ${feature.attributes[key] || '-'}`;
            });
        }

        var popupContent = `
            <div style="font-family: 'Outfit', sans-serif; min-width: 170px;">
                <h4 style="margin: 0 0 6px 0; color: ${layer.color}; font-weight:600;">${layer.name} Element</h4>
                <p style="margin: 0 0 8px 0; font-size:12px; line-height: 1.4; color: var(--text-main);">${detailsHtml}</p>
                <button id="btn-popup-delete-${L.stamp(feature)}" style="width:100%; padding:6px; background:#ef4444; color:white; border:none; border-radius:6px; font-family:inherit; font-size:11px; font-weight:600; cursor:pointer;">
                    Delete Element
                </button>
            </div>
        `;

        feature.bindPopup(popupContent).openPopup();

        setTimeout(function() {
            var delBtn = document.getElementById(`btn-popup-delete-${L.stamp(feature)}`);
            if (delBtn) {
                delBtn.addEventListener('click', function() {
                    layer.layerGroup.removeLayer(feature);
                    refreshAttributeTableIfOpen(layer);
                });
            }
        }, 100);
    });
}


// --- MEASUREMENT MATH FUNCTIONS ---

function calculateLineLength(points) {
    var total = 0;
    for (var i = 0; i < points.length - 1; i++) {
        total += points[i].distanceTo(points[i+1]);
    }
    return total;
}

function calculatePolygonArea(latlngs) {
    var radius = 6378137;
    var area = 0;
    var len = latlngs.length;
    if (len < 3) return 0;
    
    for (var i = 0; i < len; i++) {
        var p1 = latlngs[i];
        var p2 = latlngs[(i + 1) % len];
        
        var lambda1 = p1.lng * Math.PI / 180;
        var lambda2 = p2.lng * Math.PI / 180;
        var phi1 = p1.lat * Math.PI / 180;
        var phi2 = p2.lat * Math.PI / 180;
        
        area += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2));
    }
    area = area * radius * radius / 2;
    return Math.abs(area);
}


// --- MEASUREMENT UI REMOVED ---

var selectUnit = null;
var txtMeasureType = null;
var txtMeasureValue = null;

var unitsConfig = {
    'None': [{ value: 'none', label: '-' }],
    'Point': [{ value: 'coord', label: 'Coordinates (Lat, Lng)' }],
    'Line': [
        { value: 'm', label: 'Meters (m)' },
        { value: 'km', label: 'Kilometers (km)' },
        { value: 'ft', label: 'Feet (ft)' },
        { value: 'mi', label: 'Miles (mi)' }
    ],
    'Polygon': [
        { value: 'sqm', label: 'Sq Meters (m²)' },
        { value: 'sqkm', label: 'Sq Kilometers (km²)' },
        { value: 'ha', label: 'Hectares (ha)' },
        { value: 'ac', label: 'Acres (ac)' },
        { value: 'sqft', label: 'Sq Feet (ft²)' }
    ]
};

function updateMeasurementUI() {
    // The measurement/distance panel has been removed from the interface.
    if (!selectUnit || !txtMeasureType || !txtMeasureValue) return;
    txtMeasureType.textContent = lastMeasuredType;
    selectUnit.innerHTML = '';
    
    var units = unitsConfig[lastMeasuredType];
    units.forEach(unit => {
        var option = document.createElement('option');
        option.value = unit.value;
        option.textContent = unit.label;
        selectUnit.appendChild(option);
    });

    displayCalculatedValue();
}

function displayCalculatedValue() {
    var unit = selectUnit.value;
    if (lastMeasuredType === 'None') {
        txtMeasureValue.textContent = '-';
    } 
    else if (lastMeasuredType === 'Point') {
        var pt = lastMeasuredValue;
        txtMeasureValue.textContent = `${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`;
    } 
    else if (lastMeasuredType === 'Line') {
        txtMeasureValue.textContent = formatLength(lastMeasuredValue, unit);
    } 
    else if (lastMeasuredType === 'Polygon') {
        txtMeasureValue.textContent = formatArea(lastMeasuredValue, unit);
    }
}

if (selectUnit) selectUnit.addEventListener('change', displayCalculatedValue);

function resetMeasurementPanel() {
    lastMeasuredType = 'None';
    lastMeasuredValue = 0;
    updateMeasurementUI();
}

function formatLength(meters, unit) {
    switch(unit) {
        case 'km': return (meters / 1000).toFixed(3) + ' km';
        case 'ft': return (meters * 3.28084).toFixed(1) + ' ft';
        case 'mi': return (meters / 1609.344).toFixed(3) + ' mi';
        default: return meters.toFixed(1) + ' m';
    }
}

function formatArea(sqMeters, unit) {
    switch(unit) {
        case 'sqkm': return (sqMeters / 1000000).toFixed(4) + ' km²';
        case 'ha': return (sqMeters / 10000).toFixed(2) + ' ha';
        case 'ac': return (sqMeters / 4046.856).toFixed(2) + ' acres';
        case 'sqft': return (sqMeters * 10.7639).toFixed(1) + ' ft²';
        default: return sqMeters.toFixed(1) + ' m²';
    }
}


// --- INFO BUTTON ("i") COORDINATES & API DETAILS ---

var activeInfoMarker = null;

function queryLocationDetails(latlng) {
    var lat = latlng.lat;
    var lng = latlng.lng;

    document.getElementById('info-coords').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('info-elevation').textContent = "Loading...";
    document.getElementById('info-street').textContent = "Loading...";
    document.getElementById('btn-share-location').classList.add('hidden');

    if (activeInfoMarker) map.removeLayer(activeInfoMarker);
    
    // Query pins are managed as a regular layer so every map item is visible in Layers.
    var infoLayer = getOrCreateManagedLayer('layer_info_queries', 'Location Queries', 'Point', '#2563eb');
    activeInfoMarker = L.marker(latlng).addTo(infoLayer.layerGroup);
    activeInfoMarker.attributes = { query: 'Location information' };
    activeInfoMarker.centroid = latlng;
    var infoMarker = activeInfoMarker;
    cachedElev = "-";
    cachedStreet = "-";
    activeInfoMarker.on('click', function(e) {
        if (e.originalEvent) L.DomEvent.stop(e.originalEvent);
        infoLayer.layerGroup.removeLayer(this);
        if (activeInfoMarker === this) activeInfoMarker = null;
        setTool(null);

        document.getElementById('info-coords').textContent = "Click on map...";
        document.getElementById('info-elevation').textContent = "-";
        document.getElementById('info-street').textContent = "-";
        document.getElementById('btn-share-location').classList.add('hidden');
    });

    var shareBtn = document.getElementById('btn-share-location');
    shareBtn.onclick = function() {
        var shareUrl = window.location.origin + window.location.pathname + `?share=${lat.toFixed(6)},${lng.toFixed(6)}`;
        navigator.clipboard.writeText(shareUrl).then(function() {
            shareBtn.innerHTML = '<i data-lucide="check"></i> Copied Link!';
            lucide.createIcons();
            setTimeout(function() {
                shareBtn.innerHTML = '<i data-lucide="share-2"></i> Copy Location Share Link';
                lucide.createIcons();
            }, 2500);
        });
    };
    shareBtn.classList.remove('hidden');

    // Elevation (Open-Meteo API)
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.elevation && data.elevation[0] !== undefined) {
                var elevM = data.elevation[0];
                var elevF = elevM * 3.28084;
                document.getElementById('info-elevation').textContent = `${elevM.toFixed(1)} m (${elevF.toFixed(0)} ft)`;
                updateInfoPopup(infoMarker, latlng, elevM, null);
            }
        });

    // Street search (OSM Nominatim API)
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`)
        .then(res => res.json())
        .then(data => {
            if (data && data.address) {
                var address = data.address;
                var streetName = address.road || address.pedestrian || address.cycleway || address.path || address.suburb || address.village || address.city || "Unnamed area";
                document.getElementById('info-street').textContent = streetName;
                updateInfoPopup(infoMarker, latlng, null, streetName);
            }
        });
}

var cachedElev = "-";
var cachedStreet = "-";

function updateInfoPopup(marker, latlng, elevation, street) {
    if (elevation !== null) cachedElev = elevation.toFixed(1) + " m";
    if (street !== null) cachedStreet = street;

    if (marker && map.hasLayer(marker)) {
        marker.bindPopup(`
            <div style="font-family: 'Outfit', sans-serif; width: 190px;">
                <h4 style="margin: 0 0 6px 0; color: var(--primary); font-weight:600;">Queried Location</h4>
                <p style="margin:0 0 8px 0; font-size:11.5px; line-height:1.4;">
                    <b>Lat/Lng:</b> ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}<br>
                    <b>Elevation:</b> ${cachedElev}<br>
                    <b>Street:</b> ${cachedStreet}
                </p>
                <p style="margin:0; font-size:10px; color: var(--text-muted); font-style:italic;">Click this marker to remove it</p>
            </div>
        `).openPopup();
    }
}


// --- LIVE GPS TRACKING ---

var gpsWatchId = null;
var gpsMarker = null;
var gpsCircle = null;
var gpsManagedLayer = null;
var btnGps = document.getElementById('btn-gps');
var divGpsDetails = document.getElementById('gps-details');

btnGps.addEventListener('click', function() {
    if (gpsWatchId === null) startGpsTracking();
    else stopGpsTracking();
});

function startGpsTracking() {
    if (!("geolocation" in navigator)) {
        alert("GPS not supported!");
        return;
    }

    btnGps.classList.add('tracking');
    btnGps.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Locating GPS...';
    lucide.createIcons();

    gpsWatchId = navigator.geolocation.watchPosition(
        function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            var accuracy = position.coords.accuracy;
            var speed = position.coords.speed;
            var latlng = L.latLng(lat, lng);

            btnGps.innerHTML = '<i data-lucide="crosshair"></i> Stop GPS Tracker';
            lucide.createIcons();

            if (!gpsMarker) {
                gpsManagedLayer = getOrCreateManagedLayer('layer_live_gps', 'Live GPS Location', 'Point', '#6d5dfc');
                gpsMarker = L.marker(latlng, {
                    icon: L.divIcon({
                        className: 'gps-pulsing-marker',
                        iconSize: [14, 14],
                        iconAnchor: [7, 7]
                    })
                }).addTo(gpsManagedLayer.layerGroup);
                gpsMarker.attributes = { source: 'Live GPS' };
                gpsMarker.centroid = latlng;

                gpsCircle = L.circle(latlng, {
                    radius: accuracy,
                    color: '#6d5dfc',
                    fillColor: '#6d5dfc',
                    fillOpacity: 0.12,
                    weight: 1.5
                }).addTo(map);
            } else {
                gpsMarker.setLatLng(latlng);
                gpsMarker.centroid = latlng;
                gpsCircle.setLatLng(latlng).setRadius(accuracy);
            }

            map.flyTo(latlng, 16);

            document.getElementById('gps-accuracy').textContent = `± ${accuracy.toFixed(1)} m`;
            if (speed !== null && speed >= 0) {
                var speedKmh = speed * 3.6;
                var speedMph = speed * 2.23694;
                document.getElementById('gps-speed').textContent = `${speedKmh.toFixed(1)} km/h (${speedMph.toFixed(1)} mph)`;
            } else {
                document.getElementById('gps-speed').textContent = "Stationary (0 km/h)";
            }
            divGpsDetails.classList.remove('hidden');
        },
        function(error) {
            console.error(error);
            stopGpsTracking();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function stopGpsTracking() {
    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }
    if (gpsMarker) {
        if (gpsManagedLayer) gpsManagedLayer.layerGroup.removeLayer(gpsMarker);
        else map.removeLayer(gpsMarker);
        gpsMarker = null;
    }
    if (gpsCircle) { map.removeLayer(gpsCircle); gpsCircle = null; }
    btnGps.classList.remove('tracking');
    btnGps.innerHTML = '<i data-lucide="crosshair"></i> Start Live GPS';
    lucide.createIcons();
    divGpsDetails.classList.add('hidden');
}


// --- GIS ATTRIBUTE SPREADSHEET TABLE CONTROLLER ---

var currentTableLayerId = null;

var tableContainer = document.getElementById('attribute-table-container');
var tableTitle = document.getElementById('attr-table-title');
var tableHeaders = document.getElementById('attr-table-headers');
var tableRows = document.getElementById('attr-table-rows');

var btnCloseTable = document.getElementById('btn-attr-close');
var btnAddField = document.getElementById('btn-attr-add-field');
var btnCalculate = document.getElementById('btn-attr-calculate');
var btnDownloadCSV = document.getElementById('btn-attr-csv');

var addFieldModal = document.getElementById('add-field-modal');
var btnFieldSubmit = document.getElementById('btn-field-submit');
var btnFieldCancel = document.getElementById('btn-field-cancel');

var calcModal = document.getElementById('calculator-modal');
var calcFieldSelect = document.getElementById('calc-field-select');
var btnCalcApply = document.getElementById('btn-calc-apply');
var btnCalcCancel = document.getElementById('btn-calc-cancel');

function openAttributeTable(layer) {
    currentTableLayerId = layer.id;
    tableTitle.textContent = `Attribute Table: ${layer.name}`;
    tableContainer.classList.remove('hidden');
    renderAttributeTable(layer);
}

function closeTablePanel() {
    tableContainer.classList.add('hidden');
    currentTableLayerId = null;
}

btnCloseTable.addEventListener('click', closeTablePanel);

function renderAttributeTable(layer) {
    tableHeaders.innerHTML = '';
    tableRows.innerHTML = '';

    var headers = ['Sl no.', 'Lat', 'Long'];
    if (layer.type !== 'Point') {
        headers.push(layer.type === 'Line' ? 'Length (m)' : 'Area (m²)');
    }

    layer.customFields.forEach(f => headers.push(f.name));
    headers.push('Actions');

    headers.forEach(h => {
        var th = document.createElement('th');
        th.textContent = h;
        tableHeaders.appendChild(th);
    });

    var features = layer.layerGroup.getLayers();
    features.forEach((feature, idx) => {
        var tr = document.createElement('tr');
        tr.setAttribute('data-stamp', L.stamp(feature));

        tr.addEventListener('click', function() {
            document.querySelectorAll('#attr-table-rows tr').forEach(r => r.classList.remove('row-selected'));
            tr.classList.add('row-selected');
            feature.openPopup();
        });

        tr.addEventListener('dblclick', function() {
            if (feature.getBounds) {
                map.fitBounds(feature.getBounds(), { padding: [50, 50] });
            } else if (feature.getLatLng) {
                map.setView(feature.getLatLng(), 15);
            }
        });

        var tdSl = document.createElement('td');
        tdSl.textContent = idx + 1;
        tr.appendChild(tdSl);

        var tdLat = document.createElement('td');
        tdLat.textContent = feature.centroid ? feature.centroid.lat.toFixed(5) : '0';
        tr.appendChild(tdLat);

        var tdLng = document.createElement('td');
        tdLng.textContent = feature.centroid ? feature.centroid.lng.toFixed(5) : '0';
        tr.appendChild(tdLng);

        if (layer.type !== 'Point') {
            var tdGeom = document.createElement('td');
            if (layer.type === 'Line') {
                tdGeom.textContent = feature.calculatedLength ? feature.calculatedLength.toFixed(1) : '0';
            } else if (layer.type === 'Polygon') {
                tdGeom.textContent = feature.calculatedArea ? feature.calculatedArea.toFixed(1) : '0';
            }
            tr.appendChild(tdGeom);
        }

        layer.customFields.forEach(field => {
            var tdCustom = document.createElement('td');
            tdCustom.className = 'cell-editable';
            tdCustom.contentEditable = 'true';
            
            var val = (feature.attributes && feature.attributes[field.name] !== undefined) ? feature.attributes[field.name] : '';
            tdCustom.textContent = val;

            tdCustom.addEventListener('blur', function() {
                var enteredVal = tdCustom.textContent.trim();
                if (field.type === 'number') {
                    var parsed = parseFloat(enteredVal);
                    feature.attributes[field.name] = isNaN(parsed) ? 0 : parsed;
                } else {
                    feature.attributes[field.name] = enteredVal;
                }
            });

            tr.appendChild(tdCustom);
        });

        var tdDel = document.createElement('td');
        tdDel.innerHTML = `<button class="row-action-btn-del" title="Delete Feature"><i data-lucide="trash"></i></button>`;
        tdDel.querySelector('button').addEventListener('click', function(e) {
            e.stopPropagation();
            layer.layerGroup.removeLayer(feature);
            renderAttributeTable(layer);
        });
        tr.appendChild(tdDel);

        tableRows.appendChild(tr);
    });

    lucide.createIcons();
}

function refreshAttributeTableIfOpen(layer) {
    if (currentTableLayerId === layer.id) {
        renderAttributeTable(layer);
    }
}

btnAddField.addEventListener('click', function() {
    if (!currentTableLayerId) return;
    addFieldModal.classList.remove('hidden');
});

btnFieldCancel.addEventListener('click', () => addFieldModal.classList.add('hidden'));

btnFieldSubmit.addEventListener('click', function() {
    var name = document.getElementById('new-field-name').value.trim().replace(/\s+/g, '_');
    var type = document.getElementById('new-field-type').value;

    if (!name) return;

    var layer = gisLayers.find(l => l.id === currentTableLayerId);
    if (layer) {
        if (layer.customFields.find(f => f.name === name)) {
            alert("Field name already exists!");
            return;
        }

        layer.customFields.push({ name: name, type: type });
        layer.layerGroup.eachLayer(function(child) {
            if (!child.attributes) child.attributes = {};
            child.attributes[name] = type === 'number' ? 0 : '';
        });

        document.getElementById('new-field-name').value = '';
        addFieldModal.classList.add('hidden');
        renderAttributeTable(layer);
    }
});

btnCalculate.addEventListener('click', function() {
    var layer = gisLayers.find(l => l.id === currentTableLayerId);
    if (!layer) return;

    if (layer.customFields.length === 0) {
        alert("Add a custom field first before running calculations!");
        return;
    }

    calcFieldSelect.innerHTML = '';
    layer.customFields.forEach(f => {
        var opt = document.createElement('option');
        opt.value = f.name;
        opt.textContent = f.name;
        calcFieldSelect.appendChild(opt);
    });

    calcModal.classList.remove('hidden');
});

btnCalcCancel.addEventListener('click', () => calcModal.classList.add('hidden'));

btnCalcApply.addEventListener('click', function() {
    var targetField = calcFieldSelect.value;
    var formula = document.getElementById('calc-formula').value.trim();

    if (!formula) return;

    var layer = gisLayers.find(l => l.id === currentTableLayerId);
    if (layer) {
        layer.layerGroup.eachLayer(child => {
            if (!child.attributes) child.attributes = {};

            var Lat = child.centroid ? child.centroid.lat : 0;
            var Long = child.centroid ? child.centroid.lng : 0;
            var Area = child.calculatedArea || 0;
            var Length = child.calculatedLength || 0;

            var expr = formula;
            expr = expr.replace(/\bLat\b/g, Lat);
            expr = expr.replace(/\bLong\b/g, Long);
            expr = expr.replace(/\bArea\b/g, Area);
            expr = expr.replace(/\bLength\b/g, Length);

            Object.keys(child.attributes).forEach(key => {
                var val = child.attributes[key];
                if (typeof val === 'number') {
                    var regex = new RegExp(`\\[${key}\\]`, 'g');
                    expr = expr.replace(regex, val);
                } else if (typeof val === 'string') {
                    var regex = new RegExp(`\\[${key}\\]`, 'g');
                    expr = expr.replace(regex, `"${val}"`);
                }
            });

            try {
                var result = Function(`"use strict"; return (${expr})`)();
                child.attributes[targetField] = isNaN(result) ? result : parseFloat(result);
            } catch (e) {
                console.error("Formula error:", e);
            }
        });

        document.getElementById('calc-formula').value = '';
        calcModal.classList.add('hidden');
        renderAttributeTable(layer);
    }
});

btnDownloadCSV.addEventListener('click', function() {
    var layer = gisLayers.find(l => l.id === currentTableLayerId);
    if (!layer) return;
    exportLayer(layer, 'csv');
});


// --- EXPORT & DOWNLOAD FORMAT GENERATORS (GEOJSON, KML, CSV, SHAPEFILE) ---

function exportLayer(layer, format) {
    var features = layer.layerGroup.getLayers();
    if (features.length === 0) {
        alert("The layer is empty! Draw some elements first.");
        return;
    }

    var geojsonObj = layer.layerGroup.toGeoJSON();

    geojsonObj.features.forEach((feat, idx) => {
        var originalFeature = features[idx];
        if (originalFeature && originalFeature.attributes) {
            feat.properties = Object.assign({}, feat.properties, originalFeature.attributes);
        }
    });

    if (format === 'geojson') {
        downloadFile(JSON.stringify(geojsonObj, null, 2), `${layer.name.toLowerCase().replace(/\s+/g, '_')}.geojson`, 'application/json');
    }
    else if (format === 'kml') {
        var kmlString = generateKML(geojsonObj, layer.name);
        downloadFile(kmlString, `${layer.name.toLowerCase().replace(/\s+/g, '_')}.kml`, 'application/xml');
    }
    else if (format === 'csv') {
        var csvString = generateCSV(layer, features);
        downloadFile(csvString, `${layer.name.toLowerCase().replace(/\s+/g, '_')}_attributes.csv`, 'text/csv');
    }
    else if (format === 'shp') {
        triggerShapefileVectorDownload(geojsonObj, layer.name);
    }
}

function triggerShapefileVectorDownload(geojson, filename) {
    if (typeof shpwrite !== 'undefined') {
        try {
            shpwrite.download(geojson);
        } catch(e) {
            console.error("Shapefile conversion failed:", e);
            alert("Shapefile ZIP compiler failed. Downloading GeoJSON fallback.");
            downloadFile(JSON.stringify(geojson, null, 2), `${filename.toLowerCase().replace(/\s+/g, '_')}.geojson`, 'application/json');
        }
    } else {
        downloadFile(JSON.stringify(geojson, null, 2), `${filename.toLowerCase().replace(/\s+/g, '_')}.geojson`, 'application/json');
    }
}

// 1. KML XML String Generator
function generateKML(geojson, layerName) {
    var kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${layerName} Export</name>
    <description>Exported from AhBhu Web GIS</description>`;

    geojson.features.forEach((feature, index) => {
        var geom = feature.geometry;
        var props = feature.properties || {};
        var name = props.name || `Feature_${index + 1}`;
        
        var descParts = [];
        Object.keys(props).forEach(key => {
            descParts.push(`<b>${key}:</b> ${props[key]}`);
        });
        var description = descParts.join('<br>');

        kml += `
    <Placemark>
      <name>${name}</name>
      <description><![CDATA[${description}]]></description>`;

        if (geom.type === 'Point') {
            kml += `
      <Point>
        <coordinates>${geom.coordinates[0]},${geom.coordinates[1]},0</coordinates>
      </Point>`;
        } 
        else if (geom.type === 'LineString') {
            var pts = geom.coordinates.map(c => `${c[0]},${c[1]},0`).join(' ');
            kml += `
      <LineString>
        <coordinates>${pts}</coordinates>
      </LineString>`;
        } 
        else if (geom.type === 'Polygon') {
            var rings = geom.coordinates.map(ring => {
                var coords = ring.map(c => `${c[0]},${c[1]},0`).join(' ');
                return `<outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>`;
            }).join('\n');
            kml += `
      <Polygon>
        ${rings}
      </Polygon>`;
        }
        kml += `
    </Placemark>`;
    });

    kml += `
  </Document>
</kml>`;
    return kml;
}

// 2. CSV String Generator exporting boundaries as Well-Known Text (WKT)
function generateCSV(layer, features) {
    var headers = ['Sl no.', 'Lat', 'Long'];
    if (layer.type !== 'Point') {
        headers.push(layer.type === 'Line' ? 'Length_m' : 'Area_sqm');
    }
    
    layer.customFields.forEach(f => headers.push(f.name));
    headers.push('Geometry_WKT');

    var rows = [headers.join(',')];

    features.forEach((feature, index) => {
        var rowData = [];
        rowData.push(index + 1);
        rowData.push(feature.centroid ? feature.centroid.lat.toFixed(5) : '0');
        rowData.push(feature.centroid ? feature.centroid.lng.toFixed(5) : '0');

        if (layer.type !== 'Point') {
            if (layer.type === 'Line') {
                rowData.push(feature.calculatedLength ? feature.calculatedLength.toFixed(1) : '0');
            } else if (layer.type === 'Polygon') {
                rowData.push(feature.calculatedArea ? feature.calculatedArea.toFixed(1) : '0');
            }
        }

        layer.customFields.forEach(f => {
            var val = (feature.attributes && feature.attributes[f.name] !== undefined) ? feature.attributes[f.name] : '';
            if (typeof val === 'string') {
                rowData.push(`"${val.replace(/"/g, '""')}"`);
            } else {
                rowData.push(val);
            }
        });

        var wkt = '';
        if (layer.type === 'Point') {
            var latlng = feature.centroid;
            wkt = `POINT (${latlng.lng.toFixed(6)} ${latlng.lat.toFixed(6)})`;
        } 
        else if (layer.type === 'Line') {
            var coords = feature.getLatLngs().map(pt => `${pt.lng.toFixed(6)} ${pt.lat.toFixed(6)}`).join(', ');
            wkt = `LINESTRING (${coords})`;
        } 
        else if (layer.type === 'Polygon') {
            var corners = feature.getLatLngs()[0];
            var coords = corners.map(pt => `${pt.lng.toFixed(6)} ${pt.lat.toFixed(6)}`).join(', ');
            coords += `, ${corners[0].lng.toFixed(6)} ${corners[0].lat.toFixed(6)}`;
            wkt = `POLYGON ((${coords}))`;
        }

        rowData.push(`"${wkt}"`);
        rows.push(rowData.join(','));
    });

    return rows.join('\n');
}

// 3. Browser File Download Trigger
function downloadFile(content, fileName, contentType) {
    var blob = new Blob([content], { type: contentType });
    var url = URL.createObjectURL(blob);
    var tempLink = document.createElement('a');
    tempLink.href = url;
    tempLink.download = fileName;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(url);
}


// --- GIS SPATIAL QUERY & IMAGE EXTRACTOR CONTROLLER ---

var selectExtractBounds = document.getElementById('select-extract-bounds');
var selectExtractFormat = document.getElementById('select-extract-format');
var btnRunExtract = document.getElementById('btn-run-extract');

btnRunExtract.addEventListener('click', function() {
    var layerId = selectExtractBounds.value;
    var format = selectExtractFormat.value;

    if (!layerId) {
        alert("Please select a layer to download.");
        return;
    }

    var selectedLayer = gisLayers.find(layer => layer.id === layerId);
    if (!selectedLayer) return;
    exportLayer(selectedLayer, format);
});

// A. Helper to compile vectors and export as SHP Shapefile
function exportVectorBoundaryToShapefile(boundingSource) {
    var clippedFeatures = [];
    var boundaryPolygon = null;

    var boundaryLayer = gisLayers.find(l => l.id === boundingSource);
    if (boundaryLayer && boundaryLayer.layerGroup.getLayers().length > 0) {
        boundaryPolygon = boundaryLayer.layerGroup.getLayers()[0];
    } else {
        alert("Selected boundary layer contains no polygon! Please draw a polygon/rectangle in it first.");
        return;
    }

    gisLayers.forEach(layer => {
        if (layer.id === boundingSource) return;

        layer.layerGroup.eachLayer(feature => {
            var isInside = false;

            if (feature.centroid) {
                var corners = boundaryPolygon.getLatLngs()[0];
                isInside = isPointInPolygon(feature.centroid, corners);
            }

            if (isInside) {
                var geojson = feature.toGeoJSON();
                if (feature.attributes) {
                    geojson.properties = Object.assign({}, geojson.properties, feature.attributes);
                }
                clippedFeatures.push(geojson);
            }
        });
    });

    if (clippedFeatures.length === 0) {
        alert("No elements fall inside the selected boundary area to export as Shapefile!");
        return;
    }

    var outputFeatureCollection = {
        type: "FeatureCollection",
        features: clippedFeatures
    };

    triggerShapefileVectorDownload(outputFeatureCollection, 'extracted_elements');
}

// B. Helper to render map tiles onto a Canvas and geocode it (TIF + TFW download)
function exportMapToGeocodedTiff(boundingSource) {
    var mapContainer = map.getContainer();
    var width = mapContainer.clientWidth;
    var height = mapContainer.clientHeight;

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');

    var tiles = mapContainer.querySelectorAll('.leaflet-tile');
    tiles.forEach(tile => {
        var rect = tile.getBoundingClientRect();
        var mapRect = mapContainer.getBoundingClientRect();
        var x = rect.left - mapRect.left;
        var y = rect.top - mapRect.top;
        if (tile.complete && tile.naturalWidth !== 0) {
            ctx.drawImage(tile, x, y, rect.width, rect.height);
        }
    });

    var svg = mapContainer.querySelector('.leaflet-overlay-pane svg');
    if (svg) {
        var svgString = new XMLSerializer().serializeToString(svg);
        var svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(svgBlob);
        var img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            finalizeTiffGeneration(canvas, boundingSource);
        };
        img.src = url;
    } else {
        finalizeTiffGeneration(canvas, boundingSource);
    }
}

function finalizeTiffGeneration(canvas, boundingSource) {
    var bounds = map.getBounds();
    var clipPolygon = null;

    var boundaryLayer = gisLayers.find(l => l.id === boundingSource);
    if (boundaryLayer && boundaryLayer.layerGroup.getLayers().length > 0) {
        clipPolygon = boundaryLayer.layerGroup.getLayers()[0];
    } else {
        alert("Selected boundary layer contains no polygon! Please draw a polygon/rectangle in it first.");
        return;
    }

    // Crop and clip to the polygon shape
    var polyBounds = clipPolygon.getBounds();
    var nwPoint = map.latLngToContainerPoint(polyBounds.getNorthWest());
    var sePoint = map.latLngToContainerPoint(polyBounds.getSouthEast());
    
    var cropX = nwPoint.x;
    var cropY = nwPoint.y;
    var cropW = sePoint.x - nwPoint.x;
    var cropH = sePoint.y - nwPoint.y;

    if (cropW <= 0 || cropH <= 0) {
        alert("Invalid boundary polygon area size!");
        return;
    }

    var croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    var cCtx = croppedCanvas.getContext('2d');

    cCtx.beginPath();
    var latlngs = clipPolygon.getLatLngs()[0];
    latlngs.forEach((latlng, index) => {
        var pt = map.latLngToContainerPoint(latlng);
        var rx = pt.x - cropX;
        var ry = pt.y - cropY;
        if (index === 0) cCtx.moveTo(rx, ry);
        else cCtx.lineTo(rx, ry);
    });
    cCtx.closePath();
    cCtx.clip();

    cCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    bounds = polyBounds;
    canvas = croppedCanvas;

    // Compute World File coefficients (.TFW)
    var west = bounds.getWest();
    var east = bounds.getEast();
    var north = bounds.getNorth();
    var south = bounds.getSouth();

    var sizeX = (east - west) / canvas.width;
    var sizeY = (south - north) / canvas.height;
    var originX = west + (sizeX / 2);
    var originY = north + (sizeY / 2);

    var tfwContent = `${sizeX.toFixed(14)}\n0\n0\n${sizeY.toFixed(14)}\n${originX.toFixed(14)}\n${originY.toFixed(14)}`;
    var filename = 'clipped_polygon_map';
    
    // Download TIFF
    canvas.toBlob(blob => {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.tif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 'image/png');

    // Download TFW World file
    downloadFile(tfwContent, `${filename}.tfw`, 'text/plain');
}

function isPointInPolygon(point, polygonLatLngs) {
    var x = point.lng, y = point.lat;
    var inside = false;
    for (var i = 0, j = polygonLatLngs.length - 1; i < polygonLatLngs.length; j = i++) {
        var xi = polygonLatLngs[i].lng, yi = polygonLatLngs[i].lat;
        var xj = polygonLatLngs[j].lng, yj = polygonLatLngs[j].lat;
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}


// --- DEVELOPER MODAL INTERACTIVE EVENTS ---

var devModal = document.getElementById('dev-modal');
var btnAboutDev = document.getElementById('btn-about-dev');
var btnCloseDev = document.getElementById('btn-close-dev');

btnAboutDev.addEventListener('click', function() {
    devModal.classList.remove('hidden');
});

btnCloseDev.addEventListener('click', function() {
    devModal.classList.add('hidden');
});

devModal.addEventListener('click', function(e) {
    if (e.target === devModal) {
        devModal.classList.add('hidden');
    }
});

// Initial layers rendering on startup
renderLayers();
