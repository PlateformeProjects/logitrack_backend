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
// Données initiales (Seed Data)
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

const INITIAL_SHIPMENTS = [
  {
    id: 'shp-8492',
    trackingNumber: 'TRK-8492-FR',
    recipient: 'Camille Laurent',
    destinationCity: 'Lyon',
    carrier: 'Chronopost',
    status: 'IN_TRANSIT',
    departureDate: '2026-10-19T08:30:00.000Z',
    estimatedDelivery: '2026-10-22T14:00:00.000Z',
    isPriority: true,
    internalNotes: 'Accès digicode bâtiment B - Laisser au gardien si absent.'
  },
  {
    id: 'shp-3120',
    trackingNumber: 'TRK-3120-FR',
    recipient: 'Lucas Dubois',
    destinationCity: 'Marseille',
    carrier: 'DHL',
    status: 'DELIVERED',
    departureDate: '2026-10-17T06:45:00.000Z',
    estimatedDelivery: '2026-10-20T11:15:00.000Z',
    isPriority: false,
    internalNotes: 'Remis en main propre contre signature.'
  },
  {
    id: 'shp-9041',
    trackingNumber: 'TRK-9041-FR',
    recipient: 'Amina Mansouri',
    destinationCity: 'Bordeaux',
    carrier: 'FedEx',
    status: 'DELAYED',
    departureDate: '2026-10-18T10:00:00.000Z',
    estimatedDelivery: '2026-10-24T18:00:00.000Z',
    isPriority: true,
    internalNotes: 'Retard météo sur le hub de transit régional.'
  },
  {
    id: 'shp-5512',
    trackingNumber: 'TRK-5512-FR',
    recipient: 'Julien Moreau',
    destinationCity: 'Lille',
    carrier: 'UPS',
    status: 'PENDING',
    departureDate: '2026-10-21T07:00:00.000Z',
    estimatedDelivery: '2026-10-23T16:30:00.000Z',
    isPriority: false,
    internalNotes: 'Colis en cours d emballage dans l entrepôt nord.'
  },
  {
    id: 'shp-7723',
    trackingNumber: 'TRK-7723-FR',
    recipient: 'Sophie Martin',
    destinationCity: 'Nantes',
    carrier: 'Chronopost',
    status: 'IN_TRANSIT',
    departureDate: '2026-10-20T14:15:00.000Z',
    estimatedDelivery: '2026-10-22T10:00:00.000Z',
    isPriority: false,
    internalNotes: 'Livraison standard en point relais consigne.'
  },
  {
    id: 'shp-6204',
    trackingNumber: 'TRK-6204-FR',
    recipient: 'Alexandre Petit',
    destinationCity: 'Toulouse',
    carrier: 'DHL',
    status: 'DELIVERED',
    departureDate: '2026-10-16T09:20:00.000Z',
    estimatedDelivery: '2026-10-19T15:45:00.000Z',
    isPriority: false,
    internalNotes: 'Déposé dans la boîte aux lettres normalisée.'
  },
  {
    id: 'shp-1845',
    trackingNumber: 'TRK-1845-FR',
    recipient: 'Éléonore Faure',
    destinationCity: 'Strasbourg',
    carrier: 'FedEx',
    status: 'DELAYED',
    departureDate: '2026-10-18T13:00:00.000Z',
    estimatedDelivery: '2026-10-25T12:00:00.000Z',
    isPriority: true,
    internalNotes: 'Contrôle douanier en cours sur le fret frontalier.'
  },
  {
    id: 'shp-4938',
    trackingNumber: 'TRK-4938-FR',
    recipient: 'Thomas Bernard',
    destinationCity: 'Paris',
    carrier: 'UPS',
    status: 'IN_TRANSIT',
    departureDate: '2026-10-21T05:30:00.000Z',
    estimatedDelivery: '2026-10-22T09:00:00.000Z',
    isPriority: true,
    internalNotes: 'Course express 24h - Matériel médical fragile.'
  }
];

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
 * Réinitialise l'ensemble des données mémoire au jeu de données initial (8 colis).
 */
app.post('/api/v1/reset', (req, res) => {
  shipments = JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
  res.status(200).json({
    success: true,
    message: 'Les données ont été réinitialisées avec succès aux 8 expéditions initiales.',
    total: shipments.length
  });
});

// -----------------------------------------------------------------------------
// Démarrage du serveur
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`📦 LogiTrack Backend API opérationnel sur http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponibles :`);
  console.log(`   - GET    http://localhost:${PORT}/api/v1/shipments`);
  console.log(`   - GET    http://localhost:${PORT}/api/v1/shipments/:id`);
  console.log(`   - POST   http://localhost:${PORT}/api/v1/shipments`);
  console.log(`   - PUT    http://localhost:${PORT}/api/v1/shipments/:id`);
  console.log(`   - DELETE http://localhost:${PORT}/api/v1/shipments/:id`);
  console.log(`   - POST   http://localhost:${PORT}/api/v1/reset`);
  console.log('====================================================');
});
