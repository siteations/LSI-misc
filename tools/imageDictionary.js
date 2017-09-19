const fs = require('fs');
const { StringDecoder } = require('string_decoder');
const http = require('http');
const axios = require('axios');

const decoder = new StringDecoder('utf8');
const location = '../data/FLS_LocationsInventory.csv';

const list = fs.readFileSync(location);
const content = decoder.write(list).split('\n'); //read and break up csv into rows

//condense and grab values

const nameArr = [];
const keys = [];

var item = content.shift();
var elements = item.split(';');


for (var i=0; i<elements.length; i++){

	if (nameArr.indexOf(elements[i])>-1 && nameArr.indexOf(elements[i]+'(1)')>-1){
		nameArr.push(elements[i]+'(2)');
	} else if (nameArr.indexOf(elements[i])>-1){
		nameArr.push(elements[i]+'(1)');
	} else {
		nameArr.push(elements[i]);
		keys.push(elements[i]);
	}

};

//console.log(keys);

/* [ 'Processor',
  'image.ID',
  'sheet name',
  'sheet and slide number',
  'Title',
  'Title.object',
  'Title.workType',
  'Title.imageView',
  'Location.type',
  'Location.country',
  'Location.state-province',
  'Location.city-county',
  'Location.repository',
  'Location.ARTSTOR',
  'creator.Name',
  'creator.Nationality',
  'creator.Dates',
  'creator.Role',
  'creator.NameSource',
  'creator.Display',
  'Date.earliest',
  'Date.latest',
  'Date.display',
  'Date.stylePeriod',
  'Date.stylePeriod.source',
  '#culturalContext',
  '#culturalContext.source',
  'keyword',
  'Subject.source',
  'Source.photographer',
  'source.Contributor',
  'Source.institutionalContributor',
  'Source.date',
  'Source.Displaydate',
  'dateScanned',
  'dateProcessed',
  'Rights' ]

  */

//create json from rows
const rowObjs=content.map(row=>{
	let items= row.split(';');
	let newObj = {};

	for (var i=0; i<56; i++){
		let final = (nameArr[i]).length;

		if (nameArr[i][final-1]===')' && items[i]!==''){ //condense down so everything is an array
			newObj[nameArr[i].slice(0,-3)]=newObj[nameArr[i].slice(0,-3)].concat(items[i]);
		} else if (items[i]!==''){

			newObj[nameArr[i]]=[items[i]];
		} else if (items[i]===''){
			newObj[nameArr[i]]=[];
		}
	}

	return newObj;
})

// great json to work with....


//-------------------------------BASIC QUESTIONS FOR THIS DATABASE/PHOTOSET (in relation to the book)------------------------------------------------

/*
1. What are the unique sites (name, TGN, artist, style as baseline, with total number of photos per site)...sort by most to least

2. For each unique site grab all unique view types, artists, dates, style tags (etc per category) in order to explore what we have - where we can push the photo tags

3. What id numbers are missing in the overall order (what hasn't been sorted in the ArtStore system)?

4. What is the best way to sort by chapter/focus in order to facilitate text/image integration?? (conceptual question, but answer new week for integration with RA mterials)

*/

//-------------------------------BASIC QUESTIONS AS CODE------------------------------


//1. simple count of unique sites

const count={};
var countlen=0;
const edit=[];

rowObjs.forEach(entry=>{
  // if (entry['Title'][0] && (entry['Title'][0].includes(',') || entry['Title'][0].includes(')') || entry['Title'][0].includes(':'))){
  //   if (edit.indexOf(entry['Title'][0])=== -1) { edit.push(entry['Title'][0])}
  // }

	if (count[entry['Title'][0]]){
		count[entry['Title'][0]].count ++;
		count[entry['Title'][0]].imageIds = count[entry['Title'][0]].imageIds.concat(entry['image.ID'][0]);

		if (count[entry['Title'][0]].subsites.indexOf(entry['Title.object'][0])=== -1){
			count[entry['Title'][0]].subsites = count[entry['Title'][0]].subsites.concat(entry['Title.object'][0]);
		};
		if (count[entry['Title'][0]].viewTypes.indexOf(entry['Title.imageView'][0]) === -1 ){
			count[entry['Title'][0]].viewTypes = count[entry['Title'][0]].viewTypes.concat(entry['Title.imageView'][0])
		}


	} else {
		count[entry['Title'][0]]={}; // create

		 count[entry['Title'][0]].count=1; //collect and update these elements
		 count[entry['Title'][0]].subsites = [ entry['Title.object'][0]] ;
		 count[entry['Title'][0]].viewTypes = [ entry['Title.imageView'][0] ] ;
		 count[entry['Title'][0]].imageIds =  [ entry['image.ID'][0] ] ;

		count[entry['Title'][0]].creators= entry['creator.Display']; // this will be an array
		count[entry['Title'][0]].tng=entry['Location.ARTSTOR'][0]; // no need to update, grab one
		count[entry['Title'][0]].date=entry['Date.display'][0];
		count[entry['Title'][0]].aat_style = entry['Date.stylePeriod']; // this will be an array
		count[entry['Title'][0]].keywords = entry['keyword'];

		countlen++;
	}

})

//console.log('count', count, 'total number of sites: ', countlen); // so those are much less organized

//loop through and run getty query to grab lat/long generally, add to object for the moment

//testing basic remote quests


axios({
  method:'get',
  url:'http://vocab.getty.edu/tgn/1000080-geometry.json',
})
  .then(function(response) {
  console.log('latitude: ', response.data['http://vocab.getty.edu/tgn/1000080-geometry']['http://schema.org/latitude'][0].value);
  console.log('longitude: ', response.data['http://vocab.getty.edu/tgn/1000080-geometry']['http://schema.org/longitude'][0].value);
});

var nolocation=0;

for (site in count){
	siteObj = count[site];

	if (siteObj.tng && !(isNaN(+siteObj.tng)) && siteObj.tng !== undefined){
		var num = +siteObj.tng;
		console.log(num);

		axios({ //reset this to be a promise structure - after all are returned, then save out working files for quick visualization iteration. . .
		  method:'get',
		  url:'http://vocab.getty.edu/tgn/'+num+'-place.json',
		})
		  .then(function(response) {
		  let key = Object.keys(response.data)[0];
		  //console.log(response.data[key]['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value, response.data[key]['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value);
		  count[site].latitude=response.data[key]['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0].value;
		  count[site].longitude=response.data[key]['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0].value;


		}).catch(err=>{
			console.log(err.message);
		});


	} else {
		count[site].latitude=null;
		count[site].longitude = null;
		nolocation ++;

	}

};

console.log('count', count, 'total number of sites: ', countlen, 'without location: ', nolocation);

//can I hit my box images without any issue? (look up their api tonight)
//what about a simple 100+ image query to flickr? (easy sample, 100 closest pictures)

//leaflet - pick a site, display BBR json data, grab flickr and other photos -

