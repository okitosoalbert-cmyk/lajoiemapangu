# INNOVA · U-Guide FA14

Prototype local de borne pour l’Université d’Ottawa. Python 3.11 ou plus récent.

## Lancement

Depuis le dossier extrait, dans un terminal avec Python installé.

```bash
python -m venv .venv
```

Sous Windows PowerShell, lancez `.\.venv\Scripts\Activate.ps1`. Sur macOS ou Linux, lancez `source .venv/bin/activate`.

```bash
python -m pip install -r requirements.txt
python app.py
```

Ouvrez `http://127.0.0.1:5100` pour le mode navigateur ou `http://127.0.0.1:5100/?borne` pour commencer en veille. Le serveur prépare un fichier SQLite à partir de `campus.json`. La saisie texte et les fiches fonctionnent avec le serveur local. Les cartes et itinéraires externes nécessitent Internet.

## Démonstration

1. Sortez de la veille, choisissez FR ou EN et demandez où se trouve le pavillon SITE.
2. Ouvrez la carte du campus ou l’itinéraire associé à l’adresse vérifiée. Essayez ensuite « Where is the university centre? ».
3. Posez une question sur les horaires de Morisset pour voir la renonciation à une affirmation non vérifiée.
4. Choisissez **Terminer**. La borne efface les questions et prépare un QR qui transfère les fiches vérifiées. Le téléphone doit pouvoir joindre le serveur.
5. Ouvrez le lien une première fois, puis rechargez-le pour constater l’expiration.

Pour un téléphone sur le même réseau privé que le PC, définissez `INNOVA_HOST=0.0.0.0` et `INNOVA_PUBLIC_ORIGIN=http://ADRESSE_IP_DU_PC:5100` avant de lancer le serveur. En PowerShell, une variable se configure par exemple avec `$env:INNOVA_HOST = "0.0.0.0"`. Autorisez le port TCP 5100 sur le réseau privé si le pare-feu le bloque. Gardez la borne elle-même sur `localhost` pour les permissions micro/caméra. Pour un déploiement public, utilisez HTTPS et un serveur de production protégeant également les journaux du proxy.

## Configuration et limites

- **Corpus** · Huit fiches locales avec sources universitaires consultées le 20 novembre 2026. La carte officielle est externe. La base complète du campus et l’actualisation automatique restent à réaliser. L’itinéraire Google Maps part de l’emplacement choisi sur le téléphone.
- **Langue** · Les libellés suivent le choix FR/EN et les questions écrites passent par une détection simple de langue. La dictée utilise la langue choisie dans le navigateur. La synthèse suit la langue de chaque réponse et possède son propre volume.
- **Voix** · Chromium et le système doivent fournir la reconnaissance et la synthèse. Le navigateur peut utiliser un service distant pour la dictée. Le prototype affiche la transcription dans le champ pour permettre une correction avant envoi. La séparation du bruit ambiant et la détection automatique de la langue parlée restent à valider ou à développer.
- **Veille et présence** · Le prototype affiche le logo INNOVA en veille. Dans ce mode, activez la caméra pour détecter localement un visage proche et centré. Le navigateur charge MediaPipe et son modèle depuis Internet. Les images ne transitent pas par Flask et la caméra se coupe au réveil. Le bouton tactile reste disponible.
- **Gee-Gee** · La version fournie affiche un mini Gee-Gee illustré et articulé en 2D, inspiré de la photo. Il fait signe au réveil, hoche la tête à la réception d’une réponse et bouge le museau pendant la lecture vocale. Le mouvement du museau est approximatif. Avec la préférence de mouvement réduit, l’illustration s’affiche en pose fixe. Pour essayer un modèle, ajoutez `static/mascotte.glb`. Le lecteur 3D se charge depuis un CDN et cherche des clips nommés comme `Idle`, `Wave` et `Talk` dans le modèle. La synchronisation labiale et l’intégration au dispositif holographique sont à faire sur les fichiers et le matériel réels.
- **Gemini** · Définissez `GEMINI_API_KEY` côté serveur. `GEMINI_MODEL` vaut `gemini-2.5-flash` par défaut. L’intégration peut confirmer un sujet détecté à partir d’alias prédéfinis, puis Flask fournit la fiche locale. La question brute et les données libres restent locales à cette application. La configuration sans clé et le repli local sont disponibles. La clé réelle et le délai de bout en bout avec Gemini restent à vérifier.
- **Confidentialité** · Les messages vivent en mémoire dans la page. Le QR conserve dans SQLite les identifiants des fiches, la langue, un jeton et son échéance. Le serveur retire le jeton lors de sa première consultation, interdit l’accès au-delà de 15 minutes et purge les liens périmés au démarrage ou à la création d’un QR. L’archivage de transcriptions avec consentement sur 90 jours et les compteurs anonymes ne sont pas inclus.

## Validation effectuée

| Contrôle | Résultat |
|---|---|
| Dix questions API fictives FR/EN avec un courriel factice | 10/10. Adresses SITE, UCU, CRX, STEM et Morisset, orientation alimentaire, admission, clarification de bibliothèque, horaires et téléphone. |
| Inspection SQLite | Aucune ligne de transfert après les simples questions. Cinq QR générés avec uniquement les identifiants de fiches. |
| QR | Un jeton expiré refusé. Quatre liens consultés puis refusés au second accès. Le jeton du test Chromium ne figure pas dans les journaux du serveur. |
| Chromium | Saisie FR/EN, lien d’itinéraire, effacement des messages, génération et décodage de l’image QR, lecture du lien dans un second navigateur, reprise en veille et largeur mobile vérifiés. |
| Délai API locale, sans Gemini ni matériel | Médiane 1,45 ms et maximum 4,42 ms sur les dix requêtes du test. |
| Restant | Essai sur téléphone physique, Windows, caméra, bruit, voix, modèle GLB, clé Gemini réelle et borne holographique. |

Les essais ne remplacent pas la recette de l’équipe. Ils couvrent l’effacement et le partage volontaire des fiches, sans simuler une conservation consentie de transcriptions.

### Essais complémentaires

| Scénario | Résultat |
|---|---|
| Chromium à quatre tailles, en portrait et paysage | Aucun débordement horizontal. Une session vide se termine sans QR. |
| Refus caméra et micro simulés | Le navigateur affiche les messages prévus. Le démarrage tactile et le clavier virtuel permettent de demander l’adresse du CRX. |
| Requêtes Internet externes bloquées | Le site local répond à partir de SQLite. |
| Erreur HTTP 503 simulée sur les questions | Message d’erreur affiché. La question suivante aboutit après rétablissement. |
| Deux minutes d’inactivité avec horloge accélérée | L’écran revient en veille. Le champ et la conversation sont vidés. |
| Panne réseau et identifiant inattendu de Gemini simulés | Retour à la fiche officielle locale. |
| Question vide ou trop longue, identifiant QR inconnu | Requêtes refusées avec le statut 400. |
| Huit consultations concurrentes d’un même QR | Une seule reçoit le récapitulatif. Les sept autres reçoivent le statut 410. |
| Animation 2D de Gee-Gee | Chromium a rendu plusieurs images distinctes du mini-avatar pendant le salut et a affiché l’illustration sur ordinateur et mobile. Le hochement à la réponse, le mouvement du museau avec des événements de parole simulés, l’arrêt en veille et le repli statique ont été vérifiés. |
