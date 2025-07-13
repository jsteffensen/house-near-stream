const fs = require('fs');

// Helper: Calculate distance between two lat/lon points in meters using Haversine formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = angle => (angle * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = 
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Load waterbodies GeoJSON
const waterData = JSON.parse(fs.readFileSync('./waterbodies_dk.geojson', 'utf8'));

// Load houses JSON
let houses = JSON.parse(fs.readFileSync('./houses.json', 'utf8'));
houses = houses.cases;

console.log(houses.length + ' houses in cases.');

// Filter valid water features (river or stream) with geometry and get their coordinate points
const validTypes = ['river', 'stream'];

function extractCoordinates(feature) {
  if (!feature.geometry) return [];

  const type = feature.geometry.type;
  const coords = feature.geometry.coordinates;

  if (type === 'Point') {
    return [coords];
  } else if (type === 'MultiPoint' || type === 'LineString') {
    return coords;
  } else if (type === 'MultiLineString' || type === 'Polygon') {
    return coords.flat();
  } else if (type === 'MultiPolygon') {
    return coords.flat(2);
  }
  return [];
}

// Modified to retain reference to feature's properties
function extractCoordinatesWithFeature(feature) {
  const coords = extractCoordinates(feature);
  return coords.map(coord => ({ coord, properties: feature.properties }));
}

const waterPoints = waterData.features
  .filter(f => {
    const typeTag = (f.properties.waterway || f.properties.natural || f.properties.water || '').toLowerCase();
    return validTypes.includes(typeTag) && f.geometry;
  })
  .flatMap(f => extractCoordinatesWithFeature(f));

let results = [];
let closest = Infinity;

for (let i = 0; i < houses.length; i++) {
  const house = houses[i];
  
  if (!house || !house.coordinates) {
    console.log(`${i} invalid house or missing coordinates`);
    continue;
  }

  const houseLat = house.coordinates.lat;
  const houseLon = house.coordinates.lon;

  if (houseLat == null || houseLon == null) {
    house.distanceToWaterbody = null;
    console.log(`${i} null coordinates`);
    continue;
  }

  let minDist = Infinity;
  let closestFeatureName = null;

  for (const { coord: [lon, lat], properties } of waterPoints) {
    const dist = haversineDistance(houseLat, houseLon, lat, lon);
    if (dist < minDist) {
      minDist = dist;
      closestFeatureName = properties.name || properties.waterway || properties.natural || properties.water || 'Unknown';
    }
  }

  house.distanceToWaterbody = minDist === Infinity ? null : Math.round(minDist * 10) / 10;
  house.closestWaterbodyName = closestFeatureName;

  if (house.distanceToWaterbody < closest) {
    closest = house.distanceToWaterbody;
  }

  if (house.distanceToWaterbody < 100) {
    results.push({
      url: 'https://www.boligsiden.dk/adresse/' + house.address.slug,
      dist: house.distanceToWaterbody,
      name: house.closestWaterbodyName
    });
  }
}

// Output result
console.log(`Closest distance to waterbody: ${closest} meters`);
console.log(`Found ${results.length} nearby houses`);

if (results.length > 0) {
	//console.log(results);
	makeHtml(results);
}
function openBrowserTabs(results) {
	const open = (...args) => import('open').then(module => module.default(...args));
	
	(async () => {
	  for (const item of results) {
		console.log(`Opening: ${item.url} at ${item.dist} meters to ${item.name}`);
		await open(item.url);
		await new Promise(resolve => setTimeout(resolve, 2000));
	  }
	})();
}

function makeHtml(results) {
	let htmlContent = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	  <meta charset="UTF-8" />
	  <title>Houses Near Streams</title>
	</head>
	<body>
	  <h1>Houses Near Streams</h1>
	  <ul>
	`;

	results.forEach(item => {
	  htmlContent += `<li><a href="${item.url}" target="_blank">${item.url}</a> at ${item.dist} meters to ${item.name}</li>\n`;
	});

	htmlContent += `
	  </ul>
	</body>
	</html>
	`;

	// Save HTML file in the same folder as the script
	fs.writeFileSync('./results.html', htmlContent, 'utf8');
	console.log('HTML file "results.html" created with links.');
}