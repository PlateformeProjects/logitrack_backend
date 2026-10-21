# 📦 LogiTrack — Backend API

API RESTful locale développée avec Node.js et Express pour la gestion d'expéditions logistiques.  
Ce serveur fournit un jeu de **50 expéditions en mémoire vive** avec support complet des opérations CRUD, de la recherche et du filtrage.

---

## 🚀 Démarrage du Serveur

### Prérequis
- **Node.js** (version 18 ou supérieure recommandée)
- **npm** (inclus avec Node.js)

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

> **Mode développement (rechargement automatique) :**
> ```bash
> npm run dev
> ```

---

## ⚙️ Caractéristiques Techniques du Backend

- **Port d'écoute :** `3000`
- **Préfixe des routes :** `/api/v1`
- **Format des données :** JSON (`application/json`)
- **CORS activé :** Toutes les origines sont autorisées (`Access-Control-Allow-Origin: *`). Vous pouvez donc consommer l'API depuis n'importe quel serveur local de développement (ex: Live Server sur le port `5500`, `8080`, `5173`, etc.).
- **Persistance en mémoire :** Les données sont stockées en mémoire vive. Redémarrer le serveur ou appeler la route `POST /api/v1/reset` réinitialise instantanément l'état aux 50 expéditions de référence.
- **Journalisation (Logs) :** Chaque requête HTTP entrante est automatiquement affichée dans la console du terminal avec sa méthode et son URL.

---

## 🗄 Modèle de Données (`Shipment`)

Chaque expédition manipulée par l'API respecte la structure suivante :

| Champ | Type | Obligatoire | Description | Valeurs possibles / Format |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | Auto | Identifiant unique généré par le serveur | Ex: `"shp-1001"`, `"shp-1042"` |
| `trackingNumber` | `string` | Optionnel | Numéro de suivi logistique (auto-généré si omis) | Ex: `"TRK-8492-FR"` |
| `recipient` | `string` | **Oui** | Nom complet du destinataire | Ex: `"Camille Laurent"` |
| `destinationCity` | `string` | **Oui** | Ville de destination en France | Ex: `"Lyon"`, `"Marseille"`, `"Bordeaux"` |
| `carrier` | `string` | **Oui** | Transporteur assigné | `'DHL'` \| `'Chronopost'` \| `'FedEx'` \| `'UPS'` |
| `status` | `string` | Optionnel | Statut actuel du colis (`'PENDING'` par défaut) | `'IN_TRANSIT'` \| `'DELIVERED'` \| `'DELAYED'` \| `'PENDING'` |
| `departureDate` | `string` | Optionnel | Date de prise en charge (auto-générée si omise) | Format ISO 8601 (ex: `"2026-10-19T08:30:00.000Z"`) |
| `estimatedDelivery` | `string` | Optionnel | Date estimée ou effective de livraison | Format ISO 8601 (ex: `"2026-10-22T14:00:00.000Z"`) |
| `isPriority` | `boolean` | Optionnel | Colis express / haute priorité (`false` par défaut) | `true` \| `false` |
| `internalNotes` | `string` | Optionnel | Remarques et consignes d'exploitation | Ex: `"Accès digicode bâtiment B."` |

---

## 📡 Documentation des Endpoints

### Résumé des Routes

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/shipments` | Récupérer la liste des expéditions (avec recherche et filtre de statut) |
| `GET` | `/api/v1/shipments/:id` | Récupérer une expédition par son ID |
| `POST` | `/api/v1/shipments` | Créer une nouvelle expédition |
| `PUT` | `/api/v1/shipments/:id` | Mettre à jour une expédition existante |
| `DELETE` | `/api/v1/shipments/:id` | Supprimer une expédition |
| `POST` | `/api/v1/reset` | Réinitialiser les données au jeu initial (50 expéditions) |

---

### Format Standard des Réponses

Toutes les réponses de l'API suivent une structure JSON cohérente :

- **En cas de succès :**
  ```json
  {
    "success": true,
    "data": { ... } // ou tableau d'objets [ ... ]
  }
  ```
- **En cas d'erreur :**
  ```json
  {
    "success": false,
    "error": "Description détaillée de l'erreur."
  }
  ```

---

### Détail des Requêtes et Exemples

#### 1. `GET /api/v1/shipments`

Récupère la liste de toutes les expéditions.

**Paramètres d'URL optionnels (Query Parameters) :**
- `search` (chaîne) : Filtre textuel insensible à la casse comparé au `trackingNumber`, `recipient` ou `destinationCity`.
- `status` (chaîne) : Filtre sur le statut exact (`IN_TRANSIT`, `DELIVERED`, `DELAYED` ou `PENDING`).

**Exemple de requête (avec recherche et statut) :**
```http
GET /api/v1/shipments?search=Lyon&status=IN_TRANSIT HTTP/1.1
Host: localhost:3000
```

**Exemple en ligne de commande (cURL) :**
```bash
curl "http://localhost:3000/api/v1/shipments?search=Lyon&status=IN_TRANSIT"
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "total": 1,
  "data": [
    {
      "id": "shp-1001",
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

Récupère les détails complets d'une expédition ciblée par son identifiant unique.

**Exemple de requête :**
```http
GET /api/v1/shipments/shp-1001 HTTP/1.1
Host: localhost:3000
```

**Exemple cURL :**
```bash
curl http://localhost:3000/api/v1/shipments/shp-1001
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "data": {
    "id": "shp-1001",
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

Enregistre une nouvelle expédition.

**Champs obligatoires dans le corps JSON :**
- `recipient` : Nom du destinataire (non vide)
- `destinationCity` : Ville de destination (non vide)
- `carrier` : L'un des 4 transporteurs (`'DHL'`, `'Chronopost'`, `'FedEx'`, `'UPS'`)

**Champs facultatifs :**
- `status` : Défaut `'PENDING'`
- `isPriority` : Booléen, défaut `false`
- `internalNotes` : Chaîne de texte
- `trackingNumber` : Chaîne personnalisée (sinon générée automatiquement au format `TRK-XXXX-FR`)

**Exemple de requête :**
```http
POST /api/v1/shipments HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "recipient": "Sarah Connor",
  "destinationCity": "Grenoble",
  "carrier": "FedEx",
  "status": "PENDING",
  "isPriority": true,
  "internalNotes": "Matériel informatique sensible."
}
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:3000/api/v1/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "Sarah Connor",
    "destinationCity": "Grenoble",
    "carrier": "FedEx",
    "status": "PENDING",
    "isPriority": true,
    "internalNotes": "Matériel informatique sensible."
  }'
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

**Réponse `400 Bad Request` (en cas de champ obligatoire manquant) :**
```json
{
  "success": false,
  "error": "Les champs 'recipient', 'destinationCity' et 'carrier' sont obligatoires."
}
```

---

#### 4. `PUT /api/v1/shipments/:id`

Met à jour un ou plusieurs champs d'une expédition existante. Les champs non mentionnés restent inchangés.

**Exemple de requête :**
```http
PUT /api/v1/shipments/shp-1001 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "status": "DELIVERED",
  "isPriority": false,
  "internalNotes": "Colis remis en main propre contre signature."
}
```

**Exemple cURL :**
```bash
curl -X PUT http://localhost:3000/api/v1/shipments/shp-1001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DELIVERED",
    "isPriority": false,
    "internalNotes": "Colis remis en main propre contre signature."
  }'
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Expédition mise à jour avec succès.",
  "data": {
    "id": "shp-1001",
    "trackingNumber": "TRK-8492-FR",
    "recipient": "Camille Laurent",
    "destinationCity": "Lyon",
    "carrier": "Chronopost",
    "status": "DELIVERED",
    "departureDate": "2026-10-19T08:30:00.000Z",
    "estimatedDelivery": "2026-10-22T14:00:00.000Z",
    "isPriority": false,
    "internalNotes": "Colis remis en main propre contre signature."
  }
}
```

---

#### 5. `DELETE /api/v1/shipments/:id`

Supprime définitivement une expédition de la mémoire.

**Exemple de requête :**
```http
DELETE /api/v1/shipments/shp-1001 HTTP/1.1
Host: localhost:3000
```

**Exemple cURL :**
```bash
curl -X DELETE http://localhost:3000/api/v1/shipments/shp-1001
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Expédition 'TRK-8492-FR' supprimée avec succès.",
  "data": {
    "id": "shp-1001",
    "trackingNumber": "TRK-8492-FR",
    "recipient": "Camille Laurent",
    "destinationCity": "Lyon"
  }
}
```

---

#### 6. `POST /api/v1/reset`

Réinitialise immédiatement les données mémoires du serveur à leur état initial (**50 expéditions**).  
Idéal pour remettre à zéro votre environnement de test.

**Exemple de requête :**
```http
POST /api/v1/reset HTTP/1.1
Host: localhost:3000
```

**Exemple cURL :**
```bash
curl -X POST http://localhost:3000/api/v1/reset
```

**Réponse `200 OK` :**
```json
{
  "success": true,
  "message": "Les données ont été réinitialisées avec succès aux 50 expéditions initiales.",
  "total": 50
}
```
