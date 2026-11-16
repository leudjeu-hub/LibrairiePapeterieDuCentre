// Zones de livraison (données d'Alain, 16/11/2026).
// fee = frais, min = commande minimum d'articles, freeFrom = livraison offerte dès ce sous-total (null = jamais).
window.DELIVERY = { zones: [
{"id": "1", "name": {"fr": "Centre", "en": "Centre"}, "fee": 1000, "min": 2000, "freeFrom": 25000, "delay": {"fr": "Le jour même", "en": "Same day"}, "quartiers": ["Centre-ville", "Hippodrome", "Elig-Essono", "Mvog-Ada", "Briqueterie", "Mokolo", "Nlongkak", "Tsinga"]},
{"id": "2", "name": {"fr": "Proche", "en": "Nearby"}, "fee": 2000, "min": 2000, "freeFrom": 25000, "delay": {"fr": "Le jour même", "en": "Same day"}, "quartiers": ["Bastos", "Essos", "Melen", "Ngoa-Ekellé", "Etoa-Meki", "Nkolndongo", "Ekounou", "Omnisport"]},
{"id": "3", "name": {"fr": "Éloigné", "en": "Outer"}, "fee": 3000, "min": 3000, "freeFrom": null, "delay": {"fr": "Sous 24 h", "en": "Within 24 h"}, "quartiers": ["Biyem-Assi", "Mimboman", "Emana", "Mendong", "Nkolbisson", "Damas", "Ekié", "Nsimeyong"]},
{"id": "4", "name": {"fr": "Périphérie", "en": "Outskirts"}, "fee": 5000, "min": 5000, "freeFrom": null, "delay": {"fr": "À convenir", "en": "To be agreed"}, "quartiers": ["Odza", "Olembe", "Simbock", "Messamendongo", "Nkometou", "Soa"]}
] };
