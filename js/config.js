window.CONFIG = {
shopName: 'Librairie Papeterie du Centre',
demo: false,
whatsapp: '237693240396', // format international sans + ni espaces
phone: { display: '+237 6 93 24 03 96', href: 'tel:+237693240396' },
mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Carrefour+Abbia+face+Man%C3%A8ge+Yaound%C3%A9',
currency: 'FCFA',
minOrder: 2000, // commande minimum : le bouton d'envoi est bloqué en dessous, avec le montant manquant
freeFrom: null, // mettre un montant (ex. 25000) pour offrir la livraison à partir de ce sous-total
categories: [
{ id: 'cahiers', icon: 'notebook', fr: 'Cahiers & livres', en: 'Notebooks & books' },
{ id: 'ecriture', icon: 'pen', fr: 'Stylos & crayons', en: 'Pens & pencils' },
{ id: 'cartables', icon: 'bag', fr: 'Cartables & trousses', en: 'Bags & cases' },
{ id: 'geometrie', icon: 'ruler', fr: 'Géométrie & calcul', en: 'Geometry & maths' },
{ id: 'papier', icon: 'paper', fr: 'Papier & classement', en: 'Paper & filing' },
{ id: 'arts', icon: 'brush', fr: 'Dessin & arts', en: 'Art supplies' },
{ id: 'autres', icon: 'box', fr: 'Autres', en: 'Other' }
],
slots: [
{ id: 'asap', fr: 'Dès que possible', en: 'As soon as possible' },
{ id: 'matin', fr: 'Matin (8 h – 12 h)', en: 'Morning (8am – 12pm)' },
{ id: 'aprem', fr: 'Après-midi (12 h – 16 h)', en: 'Afternoon (12pm – 4pm)' },
{ id: 'soir', fr: 'Fin de journée (16 h – 19 h)', en: 'Evening (4pm – 7pm)' }
],
payments: [
{ id: 'especes', fr: 'Espèces à la livraison', en: 'Cash on delivery' },
{ id: 'mtn', fr: 'MTN Mobile Money', en: 'MTN Mobile Money' },
{ id: 'orange', fr: 'Orange Money', en: 'Orange Money' },
{ id: 'wave', fr: 'Wave', en: 'Wave' }
],
familles: [
{ id: 'f1', fr: 'Cahiers, blocs et registres', en: 'Notebooks, pads & registers', img: 'img/fam-1.jpg' },
{ id: 'f2', fr: 'Stylos, crayons et feutres', en: 'Pens, pencils & markers', img: 'img/fam-2.jpg' },
{ id: 'f3', fr: 'Géométrie et petit matériel', en: 'Geometry & small tools', img: 'img/fam-3.jpg' },
{ id: 'f4', fr: 'Sacs et cartables', en: 'Bags & school bags', img: 'img/fam-4.jpg' },
{ id: 'f5', fr: 'Arts et loisirs', en: 'Arts & crafts', img: 'img/fam-5.jpg' },
{ id: 'f6', fr: 'Accessoires de bureau', en: 'Office accessories', img: 'img/fam-6.jpg' },
{ id: 'f7', fr: 'Classement et protection', en: 'Filing & protection', img: 'img/fam-7.jpg' },
{ id: 'f8', fr: 'Papier', en: 'Paper', img: 'img/fam-8.jpg' },
{ id: 'f9', fr: 'Informatique et piles', en: 'Computing & batteries', img: 'img/fam-9.jpg' },
{ id: 'f10', fr: 'Livres scolaires', en: 'School books', img: 'img/fam-10.jpg' },
{ id: 'f11', fr: 'Livres et dictionnaires', en: 'Books & dictionaries', img: 'img/fam-11.jpg' }
],
storage: { cart: 'pdc-cart', lang: 'pdc-lang', form: 'pdc-form', custom: 'pdc-custom', install: 'pdc-install-hide' }
};
