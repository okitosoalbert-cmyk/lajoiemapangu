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

## Détection et voix automatiques

Dans Chrome, ouvre le mode borne et clique une fois sur **Activer le mode automatique**. Autorise la caméra et le microphone quand Chrome te les demande. Le bouton active aussi la lecture vocale. Laisse le centre du cadre dégagé au démarrage. Quand « Caméra active » s’affiche, avance vers le centre du cadre, attends l’indication **Je vous écoute…**, puis parle dans la langue sélectionnée. La question est envoyée dès que Chrome termine la transcription. L’écoute reste ouverte pendant la session. La borne ignore les transcriptions reçues pendant sa propre réponse pour éviter la boucle audio. Utilise le haut-parleur pour couper la lecture ou la saisie texte si la dictée rencontre un problème.

Chrome mémorise le choix sur ce PC et le mode se réactive à la prochaine ouverture de la borne sur la même adresse. Après cinq secondes consécutives sans présence détectée, INNOVA coupe le micro, efface la session et repasse en veille. Si tu reviens avant, la session continue. Si tu reviens après, la caméra réveille la borne et le micro s’active automatiquement. Chrome peut parfois terminer une session de dictée. La borne essaie de la relancer tant que l’écran est actif. Le bouton **Désactiver le mode automatique** est accessible en veille. Dès que l’approche est confirmée, Chrome ouvre directement le micro pour la dictée. Le lanceur Windows privilégie Chrome quand il est installé. Tu peux parler dès que « Je vous écoute… » s’affiche. Le délai dépend aussi de Chrome et du micro du PC. La caméra compare localement des images du centre du cadre pour détecter l’approche. Les images ne sont ni enregistrées ni transmises. Un gros changement dans le cadre peut aussi réveiller la borne.

## Configuration et limites

- **Corpus** · 76 fiches et entrées locales avec sources universitaires consultées le 20 novembre 2026. La carte officielle est externe. La base complète du campus et l’actualisation automatique restent à réaliser. L’itinéraire Google Maps part de l’emplacement choisi sur le téléphone.
- **Langue** · Les libellés suivent le choix FR/EN et les questions écrites passent par une détection simple de langue. La dictée utilise la langue choisie dans le navigateur. La synthèse suit la langue de chaque réponse et possède son propre volume.
- **Voix** · Chromium et le système doivent fournir la reconnaissance et la synthèse. Le navigateur peut utiliser un service distant pour la dictée. En mode manuel, la transcription reste dans le champ pour correction. En mode automatique, elle est envoyée lorsque Chrome termine la transcription. La séparation du bruit ambiant et la détection automatique de la langue parlée restent à valider ou à développer.
- **Veille et présence** · Le prototype affiche le logo INNOVA en veille. Dans ce mode, le navigateur détecte les changements dans le centre de l’image localement, sans modèle à télécharger. Les images ne transitent pas par Flask. La caméra reste active en mode automatique, y compris pendant la conversation, pour détecter le départ et le retour. Le bouton tactile reste disponible.
- **Gee-Gee** · La version fournie affiche un mini Gee-Gee illustré et articulé en 2D, inspiré de la photo. Il fait signe au réveil, hoche la tête à la réception d’une réponse et bouge le museau pendant la lecture vocale. Le mouvement du museau est approximatif. Avec la préférence de mouvement réduit, l’illustration s’affiche en pose fixe. Pour essayer un modèle, ajoutez `static/mascotte.glb`. Le lecteur 3D se charge depuis un CDN et cherche des clips nommés comme `Idle`, `Wave` et `Talk` dans le modèle. La synchronisation labiale et l’intégration au dispositif holographique sont à faire sur les fichiers et le matériel réels.
- **Gemini** · Sur Windows, double-cliquez sur `Configurer-Gemini.bat`, confirmez l’activation, collez votre clé personnelle dans le Bloc-notes, enregistrez et relancez INNOVA. La clé est conservée dans votre dossier utilisateur Windows, hors du projet. Les questions traitées par Gemini sont envoyées à Google. Le modèle reformule les indications du corpus dans un ton adapté aux étudiants. La carte et les liens restent gérés localement. En cas d’échec, INNOVA revient aux réponses locales. Pour désactiver Gemini, effacez la clé dans le Bloc-notes ouvert par le même lanceur, enregistrez et relancez la borne. Côté serveur, `GEMINI_API_KEY` et `INNOVA_GEMINI_SEND_QUESTIONS=1` permettent aussi de configurer la clé par l’environnement. Une clé réelle reste nécessaire pour valider la connexion.

- **Carte 3D intégrée** · Elle s’affiche automatiquement pour 60 destinations du campus principal et des secteurs Lees et Alta Vista. Elle met en évidence la destination et le CRX comme repère. Les indications cardinales sont relatives au CRX. Les empreintes et chemins proviennent d’[OpenStreetMap](https://www.openstreetmap.org/copyright) ([ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)). Les hauteurs sont schématiques et la carte ne calcule pas de parcours piéton. Les liens vers la carte officielle et l’itinéraire restent disponibles.

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
| Panne réseau et identifiant inattendu de Gemini simulés | Le serveur revient au comportement local sans inventer de fiche. |
| Question vide ou trop longue, identifiant QR inconnu | Requêtes refusées avec le statut 400. |
| Huit consultations concurrentes d’un même QR | Une seule reçoit le récapitulatif. Les sept autres reçoivent le statut 410. |
| Animation 2D de Gee-Gee | Chromium a rendu plusieurs images distinctes du mini-avatar pendant le salut et a affiché l’illustration sur ordinateur et mobile. Le hochement à la réponse, le mouvement du museau avec des événements de parole simulés, l’arrêt en veille et le repli statique ont été vérifiés. |

Le parcours automatique a été vérifié dans Chromium avec détection de présence et transcription simulées. Le test couvre le réveil à partir d’images caméra simulées, l’écoute immédiate, l’envoi vocal, la lecture de la réponse, la reprise de l’écoute et la réactivation après le départ. La précision en conditions réelles reste à vérifier sur le PC de la borne.

## Sujets et relances

La borne couvre aussi les bourses, le logement, la santé et le mieux-être, le tutorat, les carrières et stages, les loisirs, l’inscription aux cours et les accommodements. Chaque fiche renvoie à la page officielle. Après une question d’orientation, « C’est loin ? » conserve le dernier lieu de la session et donne une distance approximative à vol d’oiseau depuis le CRX. À la fin de la session, ce contexte est effacé.

## Répertoire des bâtiments

INNOVA reconnaît 64 entrées liées aux bâtiments, dont toutes les entrées du répertoire officiel consulté, les résidences et les adresses détaillées par les fiches groupées. Parmi elles, 60 destinations ont un repère intégré à partir des données OpenStreetMap. Les deux fiches de groupe et les adresses 178 Laurier et 155 Séraphin-Marion donnent accès à la fiche officielle. Les bâtiments hors du campus principal s’affichent dans leur propre secteur. Demandez « Liste des bâtiments » pour accéder au répertoire officiel.

### Orientation entre deux lieux

Demandez « Comment aller de Tabaret à SITE ? » ou, après une destination, « Et si je pars de Tabaret ? ». INNOVA indique la direction et la distance à vol d’oiseau entre les deux repères. Le lien d’itinéraire ouvre une recherche de trajet à pied avec le départ et la destination déjà renseignés. La carte affiche les deux repères lorsqu’ils sont dans le même secteur. En cas de faute dans le nom d’un bâtiment, INNOVA propose une confirmation. Une suggestion unique peut être confirmée en disant « Oui ».

## Recherche dans les pages publiques uOttawa

Si une question sur uOttawa dépasse les fiches locales, INNOVA peut chercher dans un instantané de 22 563 entrées URL-langue issues des plans de site publics d’uOttawa. Les actualités, événements et répertoires de profils ont été écartés de cet instantané. Le classement s’effectue sur le PC. Le serveur consulte jusqu’à trois pages publiques uOttawa et présente un passage ou des liens officiels. Les extraits sont mis en cache en mémoire pendant quinze minutes. Cette recherche fonctionne sans clé Gemini et demande Internet. L’instantané doit être renouvelé pour inclure les nouvelles adresses, tandis que le contenu des pages est lu à la demande. Les espaces de connexion, les PDF et les pages absentes de l’index ne sont pas couverts.

### Questions du quotidien avec Gemini

Quand Gemini est configuré, essaie « Combien font douze fois huit ? » ou « Explique-moi la méthode Pomodoro ». INNOVA demande à Gemini de répondre directement en texte simple. Elle peut lire la réponse et comprendre une relance comme « Donne-moi un exemple ». Pour cette relance, le texte de l’échange précédent peut être transmis à Gemini. Il reste dans la session active côté borne et est effacé à la mise en veille ou à la fin de la session. Les réponses générales ne sont pas ajoutées au récapitulatif QR. Les questions spécifiques au campus continuent de passer par les fiches et sources officielles.

Pour vérifier la connexion réelle, double-clique sur `Tester-Gemini.bat` après un premier lancement. Le test utilise la clé locale pour envoyer une question de calcul à Google et affiche le résultat ou la cause d’échec, sans afficher la clé. Le modèle par défaut est `gemini-3.5-flash-lite`.

Les questions générales sont envoyées directement à Gemini. Si ce service échoue, la borne affiche son diagnostic et ne lance pas de recherche dans les pages d’uOttawa.

Pour confirmer la version qui répond sur Windows, regarde le numéro et le dossier dans la fenêtre de `Lancer-INNOVA.bat`. L’onglet ouvert par le lanceur contient le même numéro dans son adresse. L’URL `/version` sur ce même port indique le numéro du serveur qui répond.

Les calculs courts écrits avec des chiffres et des signes simples, comme « Combien font 12 x 8 ? », sont calculés localement. Les autres questions générales, y compris le test de connexion dans `Tester-Gemini.bat`, continuent de passer par Gemini. Sur Windows, le lanceur réserve son port en mode exclusif et l’onglet vérifie qu’il obtient les réponses du serveur qui l’a ouvert.

La dictée automatique regroupe les fragments après environ 1,7 seconde de silence et attend davantage si Chrome transcrit encore une phrase. La synthèse vocale privilégie une voix locale, règle le volume initial à 65 % et lit les réponses longues en segments.
