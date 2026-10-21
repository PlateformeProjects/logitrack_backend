# 📦 LogiTrack — Backend API

API RESTful locale développée avec Node.js et Express pour la gestion d'expéditions logistiques.

---

## 🚀 Démarrage du Serveur

### Prérequis
- **Node.js** (version 18 ou supérieure recommandée)
- **npm**

### Installation et Lancement

1. Accédez au répertoire `backend` :
   ```bash
   cd backend
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Démarrez le serveur :
   ```bash
   npm start
   ```

Le serveur sera accessible sur **`http://localhost:3000`**.  
Un script de développement avec rechargement automatique est également disponible :
```bash
npm run dev
```

---

## 🗄 Modèle de Données (`Shipment`)

Chaque expédition renvoyée ou manipulée par l'API respecte la structure suivante :

| Champ | Type | Description | Valeurs possibles / Format |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Identifiant unique généré par le serveur | Ex: `"shp-8492"`, `"shp-3120"` |
| `trackingNumber` | `string` | Numéro de suivi logistique | Ex: `"TRK-8492-FR"` |
| `recipient` | `string` | Nom et prénom du destinataire | Ex: `"Camille Laurent"` |
| `destinationCity` | `string` | Ville de destination | Ex: `"Lyon"`, `"Marseille"` |
| `carrier` | `string` | Transporteur assigné | `'DHL'` \| `'Chronopost'` \| `'FedEx'` \| `'UPS'` |
| `status` | `string` | Statut logistique de l'expédition | `'IN_TRANSIT'` \| `'DELIVERED'` \| `'DELAYED'` \| `'PENDING'` |
| `departureDate` | `string` | Date de prise en charge | Format ISO 8601 (ex: `"2026-10-19T08:30:00.000Z"`) |
| `estimatedDelivery` | `string` | Date estimée ou effective de livraison | Format ISO 8601 (ex: `"2026-10-22T14:00:00.000Z"`) |
| `isPriority` | `boolean` | Indique si le colis est prioritaire / express | `true` \| `false` |
| `internalNotes` | `string` | Remarques et instructions internes | Ex: `"Laisser au gardien si absent."` |

---

## 📡 Documentation des Endpoints

- **URL de base :** `http://localhost:3000/api/v1`
- **En-tête requis pour POST / PUT :** `Content-Type: application/json`

### Résumé des Routes

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/shipments` | Récupérer la liste des expéditions (avec filtres optionnels) |
| `GET` | `/api/v1/shipments/:id` | Récupérer une expédition par son identifiant unique |
| `POST` | `/api/v1/shipments` | Créer une nouvelle expédition |
| `PUT` | `/api/v1/shipments/:id` | Mettre à jour une expédition existante |
| `DELETE` | `/api/v1/shipments/:id` | Supprimer une expédition |
| `POST` | `/api/v1/reset` | Réinitialiser les données au seed initial (50 expéditions) |

---

### Détail des Requêtes et Exemples

#### 1. `GET /api/v1/shipments`

Récupère la liste des expéditions.

**Paramètres d'URL optionnels (Query Parameters) :**
- `search` (chaîne) : Recherche insensible à la casse sur `trackingNumber`, `recipient` ou `destinationCity`.
- `status` (chaîne) : Filtre par statut exact (`IN_TRANSIT`, `DELIVERED`, `DELAYED`, `PENDING`).

**Exemple de requête :**
```http
GET /api/v1/shipments?search=Lyon&status=IN_TRANSIT HTTP/1.1
Host: localhost:3000
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "total": 1,
  "data": [
    {
      "id": "shp-8492",
      "trackingNumber": "TRK-8492-FR",
      "recipient": "Camille Laurent",
      "destinationCity": "Lyon",
      "carrier": "Chronopost",
      "status": "IN_TRANSIT",
      "departureDate": "2026-10-19T08:30:00.000Z",
      "estimatedDelivery": "2026-10-22T14:00:00.000Z",
      "isPriority": true,
      "internalNotes": "Accès digicode bâtiment B - Laisser au gardien si absent."
    }
  ]
}
```

---

#### 2. `GET /api/v1/shipments/:id`

Récupère les détails d'une expédition par son ID.

**Exemple de requête :**
```http
GET /api/v1/shipments/shp-8492 HTTP/1.1
Host: localhost:3000
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "id": "shp-8492",
    "trackingNumber": "TRK-8492-FR",
    "recipient": "Camille Laurent",
    "destinationCity": "Lyon",
    "carrier": "Chronopost",
    "status": "IN_TRANSIT",
    "departureDate": "2026-10-19T08:30:00.000Z",
    "estimatedDelivery": "2026-10-22T14:00:00.000Z",
    "isPriority": true,
    "internalNotes": "Accès digicode bâtiment B - Laisser au gardien si absent."
  }
}
```

**Réponse `404 Not Found` (si l'ID n'existe pas) :**
```json
{
  "success": false,
  "error": "Expédition avec l'identifiant 'shp-inconnu' introuvable."
}
```

---

#### 3. `POST /api/v1/shipments`

Crée une nouvelle expédition.  
*Remarque : Les champs `recipient`, `destinationCity` et `carrier` sont obligatoires.*  
*Si `trackingNumber` ou `id` ne sont pas fournis, le serveur les génère automatiquement.*

**Exemple de corps de requête (Body JSON) :**
```json
{
  "recipient": "Sarah Connor",
  "destinationCity": "Grenoble",
  "carrier": "FedEx",
  "status": "PENDING",
  "isPriority": true,
  "internalNotes": "Matériel informatique sensible."
}
```

**Réponse `201 Created` :**
```json
{
  "success": true,
  "message": "Expédition créée avec succès.",
  "data": {
    "id": "shp-e3a1f9",
    "trackingNumber": "TRK-5821-FR",
    "recipient": "Sarah Connor",
    "destinationCity": "Grenoble",
    "carrier": "FedEx",
    "status": "PENDING",
    "departureDate": "2026-10-21T14:55:00.000Z",
    "estimatedDelivery": "2026-10-24T14:55:00.000Z",
    "isPriority": true,
    "internalNotes": "Matériel informatique sensible."
  }
}
```

**Réponse `400 Bad Request` (données invalides) :**
```json
{
  "success": false,
  "error": "Les champs 'recipient', 'destinationCity' et 'carrier' sont obligatoires."
}
```

---

#### 4. `PUT /api/v1/shipments/:id`

Met à jour un ou plusieurs champs d'une expédition existante.

**Exemple de corps de requête (Body JSON) :**
```json
{
  "status": "DELIVERED",
  "isPriority": false,
  "internalNotes": "Colis livré en main propre contre signature."
}
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Expédition mise à jour avec succès.",
  "data": {
    "id": "shp-8492",
    "trackingNumber": "TRK-8492-FR",
    "recipient": "Camille Laurent",
    "destinationCity": "Lyon",
    "carrier": "Chronopost",
    "status": "DELIVERED",
    "departureDate": "2026-10-19T08:30:00.000Z",
    "estimatedDelivery": "2026-10-22T14:00:00.000Z",
    "isPriority": false,
    "internalNotes": "Colis livré en main propre contre signature."
  }
}
```

---

#### 5. `DELETE /api/v1/shipments/:id`

Supprime une expédition par son ID.

**Exemple de requête :**
```http
DELETE /api/v1/shipments/shp-8492 HTTP/1.1
Host: localhost:3000
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Expédition 'TRK-8492-FR' supprimée avec succès.",
  "data": {
    "id": "shp-8492",
    "trackingNumber": "TRK-8492-FR",
    "recipient": "Camille Laurent",
    "destinationCity": "Lyon"
  }
}
```

---

#### 6. `POST /api/v1/reset`

Réinitialise l'ensemble des expéditions en mémoire aux 50 expéditions par défaut de départ.

**Exemple de requête :**
```http
POST /api/v1/reset HTTP/1.1
Host: localhost:3000
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Les données ont été réinitialisées avec succès aux 50 expéditions initiales.",
  "total": 50
}
```
