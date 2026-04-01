# Esempi di Notifiche con Orario Tavolo

Questo documento mostra come appaiono le notifiche dopo l'aggiunta dell'orario del tavolo.

## 🍽️ Notifica Scansione Tavoli (Scanner)

```
🍽️ Osteria del Borgo
📅 Data: 2025-01-15
📅 Orario: martedì 15 gennaio 2025 alle ore 20:30
👥 Partecipanti (4):
  👩 Sofia Rossi (1995)
  👨 Alessandro Bianchi (1993)
  👩 Giulia Verdi (1997)
  👨 Matteo Neri (1994)
```

## 🎉 Utente Monitorato si Unisce al Tavolo

```
🎉 MONITORED USER JOINED TABLE

👤 User Details:
   Name: Marco Rossi
   Gender: ♂️
   Birth Date: 1995-03-15 (29 years old)
   Status: Confirmed participant

🏪 Restaurant: Osteria del Borgo
📍 Table ID: 294925
📅 Orario tavolo: martedì 15 gennaio 2025 alle ore 20:30

👥 Other participants (3):
   ✅ ♀️ Sofia Bianchi
   ✅ ♂️ Alessandro Verdi
   ⏳ ♀️ Giulia Neri

📊 Total participants: 4
♂️ Male: 2
♀️ Female: 2
⏰ Notification time: 15/01/2025, 18:45:32
```

## ➕ Partecipante si Unisce a Tavolo Monitorato

```
➕ PARTICIPANT JOINED MONITORED TABLE

👤 Participant Details:
   Name: Luca Bianchi
   Gender: ♂️
   Birth Date: 1992-08-20 (32 years old)
   Status: Confirmed participant
   ID: 123456

🏪 Restaurant: Osteria del Borgo
📍 Table ID: 294925
📅 Orario tavolo: martedì 15 gennaio 2025 alle ore 20:30

👥 Monitored users at table: Marco Rossi

📊 Current table status:
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Sofia Bianchi
   ✅ ♂️ Alessandro Verdi
   ✅ ♀️ Giulia Neri
   ✅ ♂️ Luca Bianchi

⏰ Notification time: 15/01/2025, 19:15:45
```

## 🚪 Utente Monitorato Lascia il Tavolo

```
🚪 MONITORED USER LEFT TABLE

👤 User: Marco Rossi
🏪 Restaurant: Osteria del Borgo
📍 Table ID: 294925
📅 Orario tavolo: martedì 15 gennaio 2025 alle ore 20:30
⏰ Notification time: 15/01/2025, 19:45:12
```

## 🔄 Tavolo Aggiornato

```
🔄 TABLE UPDATED

🏪 Restaurant: Osteria del Borgo
📍 Table ID: 294925
📅 Orario tavolo: martedì 15 gennaio 2025 alle ore 20:30
👥 Monitored users: Marco Rossi

📊 Current participants:
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Sofia Bianchi
   ✅ ♂️ Alessandro Verdi
   ✅ ♀️ Giulia Neri

⏰ Notification time: 15/01/2025, 19:30:22
```

## ❌ Tavolo Cancellato

```
❌ TABLE CANCELLED

🏪 Restaurant: Osteria del Borgo
📍 Table ID: 294925
👥 Monitored users affected: 1
📅 Orario tavolo: martedì 15 gennaio 2025 alle ore 20:30

📊 Participants who were at the table:
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Sofia Bianchi
   ✅ ♂️ Alessandro Verdi
   ✅ ♀️ Giulia Neri

⏰ Cancelled at: 15/01/2025, 18:00:15
```

## ✅ Tavolo Completato

```
✅ TABLE FINISHED

🏪 Restaurant: Osteria del Borgo
📍 Table ID: 294925
👥 Monitored users who attended: 1
📅 Orario tavolo: martedì 15 gennaio 2025 alle ore 20:30

📊 Final participants:
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Sofia Bianchi
   ✅ ♂️ Alessandro Verdi
   ✅ ♀️ Giulia Neri

⏰ Detected finished at: 16/01/2025, 08:30:45
```

## 📝 Note

- **Orario tavolo**: Mostra la data e ora prevista per il tavolo in formato italiano
- **Notification time**: Mostra quando è stata generata la notifica
- **Formato data**: Utilizza il fuso orario Europe/Rome
- **Gestione errori**: Se l'orario non è disponibile o non valido, viene mostrato un messaggio appropriato
- **Coerenza**: Tutte le notifiche ora includono l'orario del tavolo per maggiore chiarezza