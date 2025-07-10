// seedRoutes.js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS env variable
});

const db = getFirestore();

const routes = [
  {
    route: "1",
    driver: "MARIO ALAGASE",
    crew: ["AGOSTINE ESTRERA JR", "ROBERTO DEL CARMEN", "JOEY CANTAY"],
    areas: ["Don Pedro", "Polambato", "Cayang", "Taylayan", "Cogon"],
    time: "7 AM - 3 PM",
    type: "DILI MALATA",
    frequency: "DAILY",
    dayOff: "SUNDAY",
    specialCollection: "MALATA - Every WEDNESDAY",
  },
  {
    route: "2",
    driver: "REY OWATAN",
    crew: ["RICKY FRANCISCO", "REX DESUYO", "CARLITO TAMPUS"],
    areas: ["Sto. Nino", "Sudlonon", "Lourdes", "Carbon", "Pandan", "Bungtod"],
    time: "7 AM - 3 PM",
    type: "DILI MALATA",
    frequency: "DAILY",
    dayOff: "SUNDAY",
    specialCollection: "MALATA - Every FRIDAY",
  },
  {
    route: "3",
    driver: "VICENTE SUBINGSUBING",
    crew: ["NOLI DAHUNAN", "ANTHONY REMULTA", "DOMINADOR ANTOPINA"],
    areas: [
      "ARAPAL Farm",
      "Bungtod (Maharat & Laray)",
      "Dakit (Highway & Provincial Rd)",
      "Malingin Highway",
    ],
    time: "7 AM - 3 PM",
    type: "DILI MALATA",
    frequency: "DAILY",
    dayOff: "SUNDAY",
    specialCollection: "MALATA - Every TUESDAY",
  },
  {
    route: "4",
    driver: "RICARDO OLIVAR",
    crew: ["JOEL URSAL SR", "RADNE BEDRIJO", "JERMIN ANDRADE"],
    areas: [
      "A/B Cogon",
      "Siocon",
      "Odlot",
      "Marangong",
      "Libertad",
      "Guadalupe",
    ],
    time: "7 AM - 3 PM",
    type: "DILI MALATA",
    frequency: "DAILY",
    dayOff: "SATURDAY",
    specialCollection: "MALATA - Every MONDAY",
  },
];

async function seed() {
  const batch = db.batch();
  routes.forEach((route) => {
    const ref = db.collection('routes').doc();
    batch.set(ref, route);
  });
  await batch.commit();
  console.log('Routes seeded successfully!');
}

seed().catch(console.error);
