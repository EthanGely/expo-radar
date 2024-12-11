# Bienvenue sur Expo Radar 👋

Le successeur naturel de Waze !

## Demande initiale

Créer une appli React-Native avec une connexion inscription liée à Strapi, une carte affichant les radars de France, et un calcul du temps passé dans la zone d'un radar, avec sauvegarde et restitution des données avec Strapi.

## Réalisation

### Fonctionnalités développées
- Connexion / Inscription liée avec une base Strapi
- Connexion automatique si le token est valide
- Récupération asynchrone et multi-thread des radars sur l'API du Gouvernement
- Affichage d'une sélection de radars en fonction de la zone choisie sur la carte
- Affichage d'un point si la carte est dézoomée, ou d'une zone si la carte est zoomée
- Calcul des données (vitesse, distance, temps) liée à une zone radar
- Sauvegarde des données (utilisateur, radar, vitesse, distance, temps) dans la base Strapi
- Restitution des données triées en fonction de la vitesse.
