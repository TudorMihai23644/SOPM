# Ghid de utilizare

DeadlineHero transformă sarcinile personale într-un joc. Fiecare activitate (misiune) are un termen și o dificultate. Dacă o termini la timp, primești XP, monede și HP; dacă întârzii, pierzi HP.

## Cont

- **Înregistrare**: email, parolă (10–128 caractere) și o poreclă unică (3–20 caractere).
- **Parolă uitată**: din ecranul de autentificare, „Parolă uitată”. Linkul de resetare poate fi folosit o singură dată.
- **Profil**: schimbi porecla, fusul orar și parola. Tot de aici îți exporți datele (fișier JSON) sau îți ștergi contul (cere parola; ștergerea este definitivă).
- **Temă**: butonul din antet comută între tema întunecată și cea deschisă.

## Activități

| Acțiune | Reguli |
| --- | --- |
| Creare | Titlu, termen (cel puțin un minut în viitor) și dificultate: Ușor, Mediu sau Greu. Maximum 30 de activități create pe zi și 100 active în același timp. |
| Editare | Titlul și descrierea se pot schimba oricând cât activitatea e activă. Dificultatea nu se mai poate schimba. |
| Amânare | Mutarea termenului se poate face de **cel mult 2 ori**. O activitate amânată dă jumătate din XP. |
| Completare | Marchează activitatea Completă. Ai **10 secunde** pentru Undo, o singură dată. |
| Anulare / ștergere | Anularea o scoate din joc fără penalizare. Ștergerea e definitivă, dar titlul rămâne în Istoric. |
| Restant | După termen, o activitate neterminată devine Restant și pierzi HP o singură dată. O poți termina în continuare, cu recompensă redusă. |

Stări: **Urmează → Completă / Anulată / Restant**. Toate schimbările apar în pagina **Istoric**.

## Recompense

| Dificultate | XP | Monede | HP pierdut la întârziere |
| --- | --- | --- | --- |
| Ușor | 10 | 5 | 5 |
| Mediu | 25 | 10 | 10 |
| Greu | 50 | 20 | 15 |

- **La timp**: XP-ul și monedele din tabel, plus 5 HP.
- **Târziu**: 25% din XP, fără monede.
- **COMBO**: fiecare zi la rând cu cel puțin o finalizare la timp adaugă +5% la XP, până la ×1,5. Seria se pierde după o zi fără finalizări.
- **Stamina**: cel mult 150 XP pe zi de joc. Ziua de joc începe la ora 04:00, după fusul tău orar.
- **Prea rapid**: o activitate terminată în mai puțin de 60 de secunde de la creare nu dă nimic.
- **Nivel**: fiecare nivel cere cu 50 XP mai mult decât precedentul (100, 150, 200, ...). La fiecare nivel nou primești 25 de monede.

## HP și KO

- Pornești cu 100 HP (maximum 100).
- O **zi curată** (fără activități nou restante) îți dă +10 HP la 04:00.
- La **0 HP** ești KO: pierzi 20% din monede, iar HP-ul revine la 50.

## Echipe (Guild)

- O echipă are 1–4 membri; un utilizator face parte dintr-o singură echipă.
- Cine creează echipa devine **lider** și primește un **cod de invitație** de 6 caractere. Ceilalți intră cu acest cod.
- Liderul poate scoate membri și poate genera un cod nou. Dacă liderul pleacă, conducerea trece la cel mai vechi membru. O echipă rămasă fără membri se șterge.
- Pagina echipei se actualizează **în timp real**: vezi imediat când un coleg intră, pleacă sau termină un quest.

## Shared Quests

Quest-urile sunt misiuni de grup și cer o echipă de cel puțin 2 membri.

1. Un membru creează quest-ul și alege participanții (implicit toată echipa, minimum 2).
2. Fiecare participant apasă **Terminat**; starea lui devine „Așteaptă validare”.
3. Un **coleg** (niciodată tu însuți) validează sau respinge completarea, cu un motiv. La respingere, participantul revine la „În lucru”.
4. Dacă nimeni nu validează în **48 de ore**, completarea se validează automat.
5. Când toți participanții sunt validați, quest-ul e Complet.

Recompense:

- Fiecare participant validat primește recompensa personală, după aceleași reguli ca la activități.
- Validatorul primește **+5 XP**, de cel mult 3 ori pe zi.
- **Bonus de grup**: dacă toți au terminat la timp și nimeni n-a fost validat automat, fiecare participant primește 50% din XP-ul de bază. Echipa primește XP de echipă și monede în seif. Echipa poate primi cel mult 3 bonusuri pe zi.
- Un participant care nu termină până la termen devine restant și pierde HP. Liderul poate **scuti** un participant inactiv, iar cine pleacă din echipă e scutit automat.

## Aplicația mobilă

Aceleași funcții, pe Android și iOS (prin Expo Go). Glisezi la dreapta pe o misiune ca s-o marchezi Completă, la stânga pentru Anulează și Șterge.
