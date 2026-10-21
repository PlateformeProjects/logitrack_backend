/**
 * =============================================================================
 * LogiTrack API - Serveur Express Pédagogique (CDA B2)
 * =============================================================================
 * Fournit une API RESTful légère en mémoire pour la gestion des expéditions.
 * Conçu pour être exécuté localement sans configuration de base de données.
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------------
// Middlewares globaux
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Logger pédagogique pour aider les étudiants à inspecter le trafic HTTP
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// -----------------------------------------------------------------------------
// Générateur de Données (Seed Data réaliste ~ 50 expéditions)
// -----------------------------------------------------------------------------
/**
 * @typedef {'DHL' | 'Chronopost' | 'FedEx' | 'UPS'} Carrier
 * @typedef {'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'PENDING'} ShipmentStatus
 * 
 * @typedef {Object} Shipment
 * @property {string} id - Identifiant unique
 * @property {string} trackingNumber - Numéro de suivi logistique (ex: TRK-8492-FR)
 * @property {string} recipient - Nom et prénom du destinataire
 * @property {string} destinationCity - Ville de livraison
 * @property {Carrier} carrier - Transporteur assigné
 * @property {ShipmentStatus} status - Statut actuel du colis
 * @property {string} departureDate - Date de prise en charge (ISO 8601)
 * @property {string} estimatedDelivery - Date de livraison estimée ou effective (ISO 8601)
 * @property {boolean} isPriority - Colis express / haute priorité
 * @property {string} internalNotes - Remarques internes des opérateurs logistiques
 */

const RECIPIENTS = [
  'Camille Laurent', 'Lucas Dubois', 'Amina Mansouri', 'Julien Moreau',
  'Sophie Martin', 'Alexandre Petit', 'Éléonore Faure', 'Thomas Bernard',
  'Yasmine Belkacem', 'Maxime Lefebvre', 'Sarah Connor', 'David Cohen',
  'Léa Girard', 'Antoine Roux', 'Fatou Diallo', 'Nicolas Bonnet',
  'Chloé Mercier', 'Hugo Legrand', 'Inès Benali', 'Guillaume François',
  'Manon Gauthier', 'Romain Perrin', 'Claire Marchand', 'Kevin Roche',
  'Emma Meyer', 'Arthur Fontaine', 'Julie Chevalier', 'Mehdi Khelil'
];

const CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille',
  'Nantes', 'Strasbourg', 'Montpellier', 'Rennes', 'Nice', 'Grenoble',
  'Rouen', 'Toulon', 'Dijon', 'Angers', 'Brest', 'Le Mans', 'Tours',
  'Aix-en-Provence', 'Clermont-Ferrand', 'Limoges', 'Amiens', 'Metz'
];

/** @type {Carrier[]} */
const CARRIERS = ['Chronopost', 'DHL', 'FedEx', 'UPS'];

/** @type {ShipmentStatus[]} */
const STATUSES = ['IN_TRANSIT', 'DELIVERED', 'DELAYED', 'PENDING'];

const NOTES = [
  'Accès digicode bâtiment B - Laisser au gardien si absent.',
  'Remis en main propre contre signature obligatoire.',
  'Retard météo sur le hub logistique régional.',
  'Colis en cours de préparation dans l entrepôt principal.',
  'Livraison en consigne automatique sécurisée (Locker).',
  'Déposé dans la boîte aux lettres normalisée.',
  'Contrôle douanier en cours sur le fret aérien.',
  'Course express 24h - Matériel médical fragile.',
  'Appeler 15 minutes avant livraison.',
  'Deuxième présentation après échec de livraison hier.',
  'Adresse professionnelle, livraison heures de bureau uniquement.',
  'Colis volumineux - Prévoir diable de transport.',
  'Fragile : manipuler avec précaution (bouteilles en verre).',
  'Signature numérique requise.'
];

/**
 * Génère une base de données mémoire réaliste de 50 expéditions.
 * @returns {Shipment[]}
 */
function generateSeedShipments() {
  const list = [];
  const now = new Date('2026-10-21T12:00:00.000Z').getTime();

  for (let i = 1; i <= 50; i++) {
    const id = `shp-${1000 + i}`;
    const trackingCode = 1000 + Math.floor((i * 137 + 543) % 9000);
    const trackingNumber = `TRK-${trackingCode}-FR`;

    const recipient = RECIPIENTS[(i * 3 + 7) % RECIPIENTS.length];
    const destinationCity = CITIES[(i * 5 + 11) % CITIES.length];
    const carrier = CARRIERS[i % CARRIERS.length];
    const status = STATUSES[(i * 2 + 1) % STATUSES.length];

    // Calcul des dates échelonnées de manière cohérente
    const daysBefore = (i % 6) + 1;
    const departureTime = now - daysBefore * 24 * 60 * 60 * 1000 + (i * 37 % 86400000);
    const departureDate = new Date(departureTime).toISOString();

    let estimatedTime;
    if (status === 'DELIVERED') {
      estimatedTime = departureTime + ((i % 3) + 1) * 24 * 60 * 60 * 1000;
    } else if (status === 'DELAYED') {
      estimatedTime = now + ((i % 4) + 3) * 24 * 60 * 60 * 1000;
    } else {
      estimatedTime = now + ((i % 3) + 1) * 24 * 60 * 60 * 1000;
    }
    const estimatedDelivery = new Date(estimatedTime).toISOString();

    const isPriority = (i % 4 === 0) || (i % 7 === 0);
    const internalNotes = NOTES[(i * 7) % NOTES.length];

    list.push({
      id,
      trackingNumber,
      recipient,
      destinationCity,
      carrier,
      status,
      departureDate,
      estimatedDelivery,
      isPriority,
      internalNotes
    });
  }

  return list;
}

const INITIAL_SHIPMENTS = generateSeedShipments();

// État mémoire mutable (réinitialisable via /api/v1/reset)
let shipments = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));

// -----------------------------------------------------------------------------
// Routes API
// -----------------------------------------------------------------------------

/**
 * GET /api/v1/shipments
 * Récupère la liste des expéditions avec support de filtrage par recherche textuelle et statut.
 * Query params supportés :
 * - search: chaîne insensible à la casse (cherche dans trackingNumber, recipient, destinationCity)
 * - status: 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'PENDING'
 */
app.get('/api/v1/shipments', (req, res) => {
  const { search, status } = req.query;
  let results = [...shipments];

  if (status && status.trim() !== '') {
    results = results.filter((s) => s.status.toUpperCase() === status.trim().toUpperCase());
  }

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    results = results.filter((s) =>
      s.trackingNumber.toLowerCase().includes(q) ||
      s.recipient.toLowerCase().includes(q) ||
      s.destinationCity.toLowerCase().includes(q)
    );
  }

  res.status(200).json({
    success: true,
    total: results.length,
    data: results
  });
});

/**
 * GET /api/v1/shipments/:id
 * Récupère le détail d'une expédition par son ID.
 */
app.get('/api/v1/shipments/:id', (req, res) => {
  const { id } = req.params;
  const shipment = shipments.find((s) => s.id === id);

  if (!shipment) {
    return res.status(404).json({
      success: false,
      error: `Expédition avec l'identifiant '${id}' introuvable.`
    });
  }

  res.status(200).json({
    success: true,
    data: shipment
  });
});

/**
 * POST /api/v1/shipments
 * Crée une nouvelle expédition avec génération automatique d'ID et trackingNumber si omis.
 */
app.post('/api/v1/shipments', (req, res) => {
  const {
    trackingNumber,
    recipient,
    destinationCity,
    carrier,
    status = 'PENDING',
    departureDate,
    estimatedDelivery,
    isPriority = false,
    internalNotes = ''
  } = req.body;

  // Validation minimale
  if (!recipient || !destinationCity || !carrier) {
    return res.status(400).json({
      success: false,
      error: "Les champs 'recipient', 'destinationCity' et 'carrier' sont obligatoires."
    });
  }

  const validCarriers = ['DHL', 'Chronopost', 'FedEx', 'UPS'];
  if (!validCarriers.includes(carrier)) {
    return res.status(400).json({
      success: false,
      error: `Transporteur invalide. Valeurs autorisées: ${validCarriers.join(', ')}`
    });
  }

  const validStatuses = ['IN_TRANSIT', 'DELIVERED', 'DELAYED', 'PENDING'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
    });
  }

  const generatedId = `shp-${crypto.randomBytes(3).toString('hex')}`;
  const generatedTracking = trackingNumber || `TRK-${Math.floor(1000 + Math.random() * 9000)}-FR`;

  const newShipment = {
    id: generatedId,
    trackingNumber: generatedTracking,
    recipient: recipient.trim(),
    destinationCity: destinationCity.trim(),
    carrier,
    status,
    departureDate: departureDate || new Date().toISOString(),
    estimatedDelivery: estimatedDelivery || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    isPriority: Boolean(isPriority),
    internalNotes: internalNotes.trim()
  };

  shipments.unshift(newShipment);

  res.status(201).json({
    success: true,
    message: 'Expédition créée avec succès.',
    data: newShipment
  });
});

/**
 * PUT /api/v1/shipments/:id
 * Met à jour les informations d'une expédition existante (statut, priorité, notes, etc.).
 */
app.put('/api/v1/shipments/:id', (req, res) => {
  const { id } = req.params;
  const index = shipments.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Expédition avec l'identifiant '${id}' introuvable.`
    });
  }

  const current = shipments[index];
  const {
    status,
    isPriority,
    internalNotes,
    carrier,
    destinationCity,
    recipient,
    estimatedDelivery
  } = req.body;

  // Validation optionnelle du statut si transmis
  if (status !== undefined) {
    const validStatuses = ['IN_TRANSIT', 'DELIVERED', 'DELAYED', 'PENDING'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
      });
    }
  }

  // Application des modifications partielles
  const updatedShipment = {
    ...current,
    status: status !== undefined ? status : current.status,
    isPriority: isPriority !== undefined ? Boolean(isPriority) : current.isPriority,
    internalNotes: internalNotes !== undefined ? String(internalNotes).trim() : current.internalNotes,
    carrier: carrier !== undefined ? carrier : current.carrier,
    destinationCity: destinationCity !== undefined ? destinationCity.trim() : current.destinationCity,
    recipient: recipient !== undefined ? recipient.trim() : current.recipient,
    estimatedDelivery: estimatedDelivery !== undefined ? estimatedDelivery : current.estimatedDelivery
  };

  shipments[index] = updatedShipment;

  res.status(200).json({
    success: true,
    message: 'Expédition mise à jour avec succès.',
    data: updatedShipment
  });
});

/**
 * DELETE /api/v1/shipments/:id
 * Supprime une expédition par son ID.
 */
app.delete('/api/v1/shipments/:id', (req, res) => {
  const { id } = req.params;
  const index = shipments.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Expédition avec l'identifiant '${id}' introuvable.`
    });
  }

  const deleted = shipments.splice(index, 1)[0];

  res.status(200).json({
    success: true,
    message: `Expédition '${deleted.trackingNumber}' supprimée avec succès.`,
    data: deleted
  });
});

/**
 * POST /api/v1/reset
 * Réinitialise l'ensemble des données mémoire au jeu de données initial (50 colis).
 */
app.post('/api/v1/reset', (req, res) => {
  shipments = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
  res.status(200).json({
    success: true,
    message: `Les données ont été réinitialisées avec succès aux ${shipments.length} expéditions initiales.`,
    total: shipments.length
  });
});

// -----------------------------------------------------------------------------
// Démarrage du serveur
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`📦 LogiTrack Backend API opérationnel sur http://localhost:${PORT}`);
  console.log(`📊 Jeu initial chargé : ${shipments.length} expéditions logistiques`);
  console.log(`📡 Endpoints disponibles :`);
  console.log(`   - GET    http://localhost:${PORT}/api/v1/shipments`);
  console.log(`   - GET    http://localhost:${PORT}/api/v1/shipments/:id`);
  console.log(`   - POST   http://localhost:${PORT}/api/v1/shipments`);
  console.log(`   - PUT    http://localhost:${PORT}/api/v1/shipments/:id`);
  console.log(`   - DELETE http://localhost:${PORT}/api/v1/shipments/:id`);
  console.log(`   - POST   http://localhost:${PORT}/api/v1/reset`);
  console.log('====================================================');
});
