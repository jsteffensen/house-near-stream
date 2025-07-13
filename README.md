# Find a house for sale in Denmark near a stream


## Download data from boligsiden

* Go to https://www.boligsiden.dk/tilsalg/landejendom/kort?mapBounds=8.548931,55.856524,10.354922,56.443551&splitViewPage=3&priceMax=2000000
* Hit F12
* Find the api address and change the param per_page to a large number e.g. https://api.boligsiden.dk/search/cases?addressTypes=farm%2Chobby+farm&per_page=800&highlighted=true&sortBy=random
* Right click and save as json file.

## Download water body data from overpass-turbo

* Go to https://overpass-turbo.eu/
* Paste search ```[out:json][timeout:1800];
area["name"="Denmark"]->.searchArea;
(
  way["waterway"~"river|stream"](area.searchArea);
  relation["waterway"~"river|stream"](area.searchArea);
);
out geom;```
* Export as geojson

## Filter data

