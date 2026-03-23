// This file contains the geographical data for various zones in Trento.
// In a real-world application, this data would likely come from a GIS database or a GeoJSON file.
// For this example, we are defining them as constants.

export const ZONES = [
  {
    id: 'centro',
    name: 'Centro Storico',
    description: 'The historic city center of Trento, featuring Piazza Duomo and various historic buildings.',
    bounds: [
      [46.0705, 11.121],
      [46.068, 11.124],
      [46.065, 11.122],
      [46.067, 11.118],
    ],
    color: 'blue',
  },
  {
    id: 'stazione',
    name: 'Stazione / Piedicastello',
    description: 'Area surrounding the main train station and the Piedicastello district.',
    bounds: [
      [46.069, 11.115],
      [46.071, 11.117],
      [46.068, 11.121],
      [46.066, 11.116],
    ],
    color: 'green',
  },
  {
    id: 'ospedale',
    name: 'Ospedale Santa Chiara',
    description: 'The area around the main city hospital, Ospedale Santa Chiara.',
    bounds: [
      [46.061, 11.129],
      [46.063, 11.132],
      [46.060, 11.135],
      [46.058, 11.131],
    ],
    color: 'red',
  },
];
