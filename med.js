/* ═══ Ilustración médica: textos, categorías y títulos (lo lee build.js) ═══
   Imágenes: img/med/<cat>/NNN.jpg (1400 px) y NNN-t.jpg (560 px), listadas en img/med/manifest.json
   Animaciones: video/med/NN.mp4 + NN.jpg (póster), listadas en video/med/list.json
   Para añadir una imagen: guárdala con el siguiente número y añádela al manifest (w y h de la imagen grande). */

/* Áreas, en el orden de la página. cover = número de la imagen de portada */
const CATS=[
 {k:'anat',cover:'050',slug:{es:'anatomia-cirugia',ca:'anatomia-cirurgia',en:'anatomy-surgery',fr:'anatomie-chirurgie'},
  name:{es:'Anatomía y cirugía',ca:'Anatomia i cirurgia',en:'Anatomy & surgery',fr:'Anatomie et chirurgie'},
  intro:{es:'Anatomía humana, técnicas quirúrgicas y procedimientos clínicos para libros de medicina, revistas especializadas y servicios hospitalarios.',ca:'Anatomia humana, tècniques quirúrgiques i procediments clínics per a llibres de medicina, revistes especialitzades i serveis hospitalaris.',en:'Human anatomy, surgical techniques and clinical procedures for medical books, specialist journals and hospital departments.',fr:'Anatomie humaine, techniques chirurgicales et procédures cliniques pour livres de médecine, revues spécialisées et services hospitaliers.'}},
 {k:'res',cover:'011',slug:{es:'investigacion',ca:'recerca',en:'research',fr:'recherche'},
  name:{es:'Investigación biomédica',ca:'Recerca biomèdica',en:'Biomedical research',fr:'Recherche biomédicale'},
  intro:{es:'Esquemas de mecanismos celulares y moleculares para grupos de investigación, artículos científicos y congresos.',ca:'Esquemes de mecanismes cel·lulars i moleculars per a grups de recerca, articles científics i congressos.',en:'Diagrams of cellular and molecular mechanisms for research groups, scientific papers and conferences.',fr:'Schémas de mécanismes cellulaires et moléculaires pour des équipes de recherche, des articles scientifiques et des congrès.'}},
 {k:'nat',cover:'068',slug:{es:'ciencias-naturales',ca:'ciencies-naturals',en:'natural-sciences',fr:'sciences-naturelles'},
  name:{es:'Ciencias naturales',ca:'Ciències naturals',en:'Natural sciences',fr:'Sciences naturelles'},
  intro:{es:'Biología, zoología, ecología, geología y astronomía para libros de texto y divulgación científica.',ca:'Biologia, zoologia, ecologia, geologia i astronomia per a llibres de text i divulgació científica.',en:'Biology, zoology, ecology, geology and astronomy for textbooks and popular science.',fr:'Biologie, zoologie, écologie, géologie et astronomie pour manuels scolaires et vulgarisation scientifique.'}},
 {k:'vet',cover:'002',slug:{es:'veterinaria',ca:'veterinaria',en:'veterinary',fr:'veterinaire'},
  name:{es:'Veterinaria',ca:'Veterinària',en:'Veterinary',fr:'Vétérinaire'},
  intro:{es:'Anatomía veterinaria y neuroanatomía comparada.',ca:'Anatomia veterinària i neuroanatomia comparada.',en:'Veterinary anatomy and comparative neuroanatomy.',fr:'Anatomie vétérinaire et neuroanatomie comparée.'}},
 {k:'tec',cover:'013',slug:{es:'tecnologia',ca:'tecnologia',en:'technology',fr:'technologie'},
  name:{es:'Tecnología',ca:'Tecnologia',en:'Technology',fr:'Technologie'},
  intro:{es:'Máquinas, aparatos e instalaciones explicados con ilustración técnica.',ca:'Màquines, aparells i instal·lacions explicats amb il·lustració tècnica.',en:'Machines, devices and installations explained through technical illustration.',fr:'Machines, appareils et installations expliqués par l’illustration technique.'}},
 {k:'des',cover:'011',slug:{es:'diseno-grafico',ca:'disseny-grafic',en:'graphic-design',fr:'design-graphique'},
  name:{es:'Diseño gráfico',ca:'Disseny gràfic',en:'Graphic design',fr:'Design graphique'},
  intro:{es:'Carteles, portadas, folletos y obra gráfica de temática médica y científica.',ca:'Cartells, portades, fullets i obra gràfica de temàtica mèdica i científica.',en:'Posters, covers, leaflets and artwork on medical and scientific themes.',fr:'Affiches, couvertures, dépliants et créations graphiques sur des thèmes médicaux et scientifiques.'}},
 {k:'pos',cover:'016',slug:{es:'laminas',ca:'lamines',en:'posters',fr:'planches'},
  name:{es:'Láminas y arte médico',ca:'Làmines i art mèdic',en:'Posters & medical art',fr:'Planches et art médical'},
  intro:{es:'Láminas didácticas de anatomía (70 × 50 cm, sin marco) e ilustración médica artística.',ca:'Làmines didàctiques d’anatomia (70 × 50 cm, sense marc) i il·lustració mèdica artística.',en:'Educational anatomy posters (70 × 50 cm, unframed) and artistic medical illustration.',fr:'Planches pédagogiques d’anatomie (70 × 50 cm, sans cadre) et illustration médicale artistique.'}},
 {k:'ani',cover:'05',slug:{es:'animaciones',ca:'animacions',en:'animations',fr:'animations'},
  name:{es:'Animación 2D',ca:'Animació 2D',en:'2D animation',fr:'Animation 2D'},
  intro:{es:'Animaciones didácticas de procesos biológicos, técnicas médicas y mecanismos moleculares.',ca:'Animacions didàctiques de processos biològics, tècniques mèdiques i mecanismes moleculars.',en:'Educational animations of biological processes, medical techniques and molecular mechanisms.',fr:'Animations pédagogiques de processus biologiques, de techniques médicales et de mécanismes moléculaires.'}}];

/* Títulos de las láminas (por número de imagen); las demás se muestran sin título */
const POS={'001':{es:'Órganos genitales femeninos',ca:'Òrgans genitals femenins',en:'Female reproductive organs',fr:'Organes génitaux féminins'},
 '003':{es:'Los músculos',ca:'Els músculs',en:'The muscles',fr:'Les muscles'},
 '004':{es:'Órganos genitales masculinos',ca:'Òrgans genitals masculins',en:'Male reproductive organs',fr:'Organes génitaux masculins'},
 '005':{es:'El aparato digestivo',ca:'L’aparell digestiu',en:'The digestive system',fr:'L’appareil digestif'},
 '006':{es:'El cuerpo humano',ca:'El cos humà',en:'The human body',fr:'Le corps humain'},
 '007':{es:'La deglución',ca:'La deglució',en:'Swallowing',fr:'La déglutition'},
 '008':{es:'El corazón',ca:'El cor',en:'The heart',fr:'Le cœur'},
 '009':{es:'El riñón',ca:'El ronyó',en:'The kidney',fr:'Le rein'}};

/* Títulos de las animaciones (por número); sin título → «Animación 2D» */
const VID={'01':{es:'El corazón y la sangre',ca:'El cor i la sang',en:'The heart and the blood',fr:'Le cœur et le sang'},
 '04':{es:'Colonoscopia',ca:'Colonoscòpia',en:'Colonoscopy',fr:'Coloscopie'},
 '05':{es:'Ictus',ca:'Ictus',en:'Stroke',fr:'AVC'},
 '08':{es:'Mecanismo de un inhibidor',ca:'Mecanisme d’un inhibidor',en:'How an inhibitor works',fr:'Mécanisme d’un inhibiteur'},
 '10':{es:'Antígenos',ca:'Antígens',en:'Antigens',fr:'Antigènes'},
 '11':{es:'Oxigenación de la sangre',ca:'Oxigenació de la sang',en:'Blood oxygenation',fr:'Oxygénation du sang'},
 '14':{es:'El complejo inflamasoma',ca:'El complex inflamasoma',en:'The inflammasome complex',fr:'Le complexe inflammasome'},
 '17':{es:'Cáncer de hígado',ca:'Càncer de fetge',en:'Liver cancer',fr:'Cancer du foie'}};

/* Selección destacada de la página principal: [categoría, número] */
const FEAT=[['anat','050'],['res','011'],['nat','068'],['des','011'],['anat','054'],['pos','019'],['vet','001'],['anat','067'],['nat','046'],['res','025'],['tec','013'],['des','029'],['anat','109'],['nat','026'],['pos','026'],['anat','080']];

/* Clientes (CV y logotipos del portfolio) */
const HOS=['Hospital Clínic de Barcelona','Fundació Puigvert','Hospital de la Santa Creu i Sant Pau','Hospital del Mar','Hospital Universitari Germans Trias i Pujol','Parc Taulí · Hospital Universitari de Sabadell','Hospital de l’Esperança','Hospital Universitario 12 de Octubre','Hospital Clínico San Carlos · Madrid','Centro Médico Teknon','Clínica Otológica García-Ibáñez','Hôpital Lapeyronie · Montpellier','Consorci Sanitari Integral'];
const INST=['Facultat de Medicina · Universitat de Barcelona (Bellvitge)','Universitat Autònoma de Barcelona','Faculté de médecine de Strasbourg','IDIBAPS','IrsiCaixa','Institut Germans Trias i Pujol (IGTP)','Institut d’Investigacions Biomèdiques de Barcelona (IIBB)','WebSurg · IRCAD','EDQM · Consejo de Europa','EF Clif','Fundación Esther Koplowitz'];
const PUB=['Editorial Médica Panamericana','McGraw-Hill Interamericana','Espax Médica','Masson','Ediciones Permanyer','J&C Ediciones Médicas','Journal of Vascular Surgery','Annals of Surgery','World Journal of Surgery','Oxford University Press','Santillana','Grupo SM','Edelvives','Edebé','Vicens Vives','Cruïlla','Casals','Baula','Castellnou','Luis Vives','Algaida','Parramón','Magnard · Delagrave','Éditions Bréal','Fransel','Science & Vie','Pour la Science'];
/* Créditos de investigación (tal como aparecen publicados) */
const RES=['Clària J, Titos E, López-Vicario C, González-Périz A. Resolvins, protectins and other novel lipid mediators in obesity-associated inflammatory disorders. Drug Discov Today Dis Mech 2010;7:e219–e225.',
 'Clària J, González-Périz A, López-Vicario C, Rius B, Titos E. New insights into the role of macrophages in adipose tissue inflammation and fatty liver disease: modulation by endogenous omega-3 fatty acid-derived lipid mediators. Front Immunol 2011. doi:10.3389/fimmu.2011.00049.',
 'Anna Planas · IDIBAPS, Institut d’Investigacions Biomèdiques August Pi i Sunyer, Barcelona.',
 'Josep Dalmau, MD, PhD · ICREA-IDIBAPS, Servei de Neurologia, Hospital Clínic, Universitat de Barcelona; University of Pennsylvania.',
 'Dr. Antoni Matilla Dueñas · Unitat de Recerca Bàsica, Translacional i de Neurogenètica Molecular, Institut Germans Trias i Pujol (IGTP).'];

const T={
es:{title:'Ilustración médica y científica | Pere Lluís León, ilustrador médico en Barcelona',d:'Pere Lluís León, ilustrador médico y científico en Barcelona: anatomía, cirugía, investigación biomédica, ciencias naturales, veterinaria y animación 2D para hospitales, editoriales médicas y revistas especializadas.',
 kick:'Ilustrador médico y científico',lead:'Más de tres décadas creando ilustraciones médicas para hospitales, facultades de medicina, libros y revistas especializadas, presentaciones y animaciones 2D.',
 see:'Ver los trabajos',ord:'Encargar una ilustración',
 svc:[['Libros y revistas','Anatomía, cirugía y microbiología para editoriales médicas y revistas científicas.'],['Hospitales y universidades','Material docente y de comunicación para servicios médicos y facultades.'],['Investigación','Figuras y esquemas para artículos, congresos y presentaciones.'],['Animación 2D','Procesos biológicos y técnicas quirúrgicas en movimiento.']],
 areas:'Áreas de trabajo',n:'ilustraciones',nv:'animaciones',feat:'Selección',
 profH:'Perfil',prof:['Comunicador visual experto en biomedicina, ciencias naturales y técnica. Une el oficio del dibujo con un conocimiento científico y médico exacto, en técnicas tradicionales e infográficas.','Tras formarse en bellas artes en la Llotja y la Escola Massana, fue director artístico en agencias de publicidad médica para laboratorios. Desde 1992 trabaja por cuenta propia, y entre 1992 y 2005 colaboró con el Departamento de Anatomía de la Facultad de Medicina de Barcelona, en Bellvitge.','Ha realizado libros de anatomía, cirugía y microbiología para editoriales médicas, ilustraciones para revistas médico-quirúrgicas y de divulgación científica, y proyectos de comunicación visual con hospitales y facultades de España y Europa.'],
 facts:[['Formación','Bellas artes · Escola Massana · Llotja'],['Por cuenta propia','Desde 1992'],['Herramientas','Illustrator · Photoshop · Animate · PowerPoint'],['Idiomas','Catalán · castellano · francés · inglés · italiano']],
 cliH:'Clientes',hos:'Hospitales y clínicas',inst:'Universidades e instituciones',pub:'Editoriales y revistas',resH:'Créditos en investigación',expH:'Exposiciones de arte médico',
 ctaH:'¿Tienes un proyecto?',ctaP:'Ilustración médica, quirúrgica o científica para publicaciones, docencia, congresos o divulgación. Cuéntanos qué necesitas.',ctaB:'Escribir al ilustrador',
 other:'Otras áreas',all:'Ilustración médica',ct:(n,t)=>`${t} — ilustración médica | Pere Lluís León`,cd:(n,i)=>`${i} ${n} de Pere Lluís León, ilustrador médico y científico en Barcelona.`,anim:'Animación 2D',play:'Reproducir'},
ca:{title:'Il·lustració mèdica i científica | Pere Lluís León, il·lustrador mèdic a Barcelona',d:'Pere Lluís León, il·lustrador mèdic i científic a Barcelona: anatomia, cirurgia, recerca biomèdica, ciències naturals, veterinària i animació 2D per a hospitals, editorials mèdiques i revistes especialitzades.',
 kick:'Il·lustrador mèdic i científic',lead:'Més de tres dècades creant il·lustracions mèdiques per a hospitals, facultats de medicina, llibres i revistes especialitzades, presentacions i animacions 2D.',
 see:'Veure els treballs',ord:'Encarregar una il·lustració',
 svc:[['Llibres i revistes','Anatomia, cirurgia i microbiologia per a editorials mèdiques i revistes científiques.'],['Hospitals i universitats','Material docent i de comunicació per a serveis mèdics i facultats.'],['Recerca','Figures i esquemes per a articles, congressos i presentacions.'],['Animació 2D','Processos biològics i tècniques quirúrgiques en moviment.']],
 areas:'Àrees de treball',n:'il·lustracions',nv:'animacions',feat:'Selecció',
 profH:'Perfil',prof:['Comunicador visual expert en biomedicina, ciències naturals i tècnica. Uneix l’ofici del dibuix amb un coneixement científic i mèdic exacte, en tècniques tradicionals i infogràfiques.','Després de formar-se en belles arts a la Llotja i l’Escola Massana, va ser director artístic en agències de publicitat mèdica per a laboratoris. Des del 1992 treballa pel seu compte, i entre el 1992 i el 2005 va col·laborar amb el Departament d’Anatomia de la Facultat de Medicina de Barcelona, a Bellvitge.','Ha fet llibres d’anatomia, cirurgia i microbiologia per a editorials mèdiques, il·lustracions per a revistes medicoquirúrgiques i de divulgació científica, i projectes de comunicació visual amb hospitals i facultats d’Espanya i d’Europa.'],
 facts:[['Formació','Belles arts · Escola Massana · Llotja'],['Pel seu compte','Des del 1992'],['Eines','Illustrator · Photoshop · Animate · PowerPoint'],['Idiomes','Català · castellà · francès · anglès · italià']],
 cliH:'Clients',hos:'Hospitals i clíniques',inst:'Universitats i institucions',pub:'Editorials i revistes',resH:'Crèdits en recerca',expH:'Exposicions d’art mèdic',
 ctaH:'Tens un projecte?',ctaP:'Il·lustració mèdica, quirúrgica o científica per a publicacions, docència, congressos o divulgació. Explica’ns què necessites.',ctaB:'Escriure a l’il·lustrador',
 other:'Altres àrees',all:'Il·lustració mèdica',ct:(n,t)=>`${t} — il·lustració mèdica | Pere Lluís León`,cd:(n,i)=>`${i} ${n} de Pere Lluís León, il·lustrador mèdic i científic a Barcelona.`,anim:'Animació 2D',play:'Reproduir'},
en:{title:'Medical & Scientific Illustration | Pere Lluís León, Medical Illustrator in Barcelona',d:'Pere Lluís León, medical and scientific illustrator in Barcelona: anatomy, surgery, biomedical research, natural sciences, veterinary and 2D animation for hospitals, medical publishers and specialist journals.',
 kick:'Medical & scientific illustrator',lead:'More than three decades of medical illustration for hospitals, medical schools, books and specialist journals, presentations and 2D animation.',
 see:'See the work',ord:'Commission an illustration',
 svc:[['Books & journals','Anatomy, surgery and microbiology for medical publishers and scientific journals.'],['Hospitals & universities','Teaching and communication material for clinical departments and faculties.'],['Research','Figures and diagrams for papers, conferences and presentations.'],['2D animation','Biological processes and surgical techniques in motion.']],
 areas:'Areas of work',n:'illustrations',nv:'animations',feat:'Selected work',
 profH:'Profile',prof:['A visual communicator specialising in biomedicine, natural sciences and technology, combining the craft of drawing with exact scientific and medical knowledge, in both traditional and digital techniques.','After studying fine arts at Llotja and the Escola Massana, he was art director at medical advertising agencies working for pharmaceutical laboratories. He has worked freelance since 1992, and from 1992 to 2005 collaborated with the Department of Anatomy of the Faculty of Medicine in Barcelona, at Bellvitge.','He has produced anatomy, surgery and microbiology books for medical publishers, illustrations for surgical and popular-science journals, and visual communication projects with hospitals and faculties across Spain and Europe.'],
 facts:[['Training','Fine arts · Escola Massana · Llotja'],['Freelance','Since 1992'],['Tools','Illustrator · Photoshop · Animate · PowerPoint'],['Languages','Catalan · Spanish · French · English · Italian']],
 cliH:'Clients',hos:'Hospitals and clinics',inst:'Universities and institutions',pub:'Publishers and journals',resH:'Research credits',expH:'Medical art exhibitions',
 ctaH:'Have a project in mind?',ctaP:'Medical, surgical or scientific illustration for publications, teaching, conferences or public outreach. Tell us what you need.',ctaB:'Write to the illustrator',
 other:'Other areas',all:'Medical illustration',ct:(n,t)=>`${t} — Medical Illustration | Pere Lluís León`,cd:(n,i)=>`${i} ${n} by Pere Lluís León, medical and scientific illustrator in Barcelona.`,anim:'2D animation',play:'Play'},
fr:{title:'Illustration médicale et scientifique | Pere Lluís León, illustrateur médical à Barcelone',d:'Pere Lluís León, illustrateur médical et scientifique à Barcelone : anatomie, chirurgie, recherche biomédicale, sciences naturelles, vétérinaire et animation 2D pour hôpitaux, éditeurs médicaux et revues spécialisées.',
 kick:'Illustrateur médical et scientifique',lead:'Plus de trois décennies d’illustration médicale pour hôpitaux, facultés de médecine, livres et revues spécialisées, présentations et animations 2D.',
 see:'Voir les travaux',ord:'Commander une illustration',
 svc:[['Livres et revues','Anatomie, chirurgie et microbiologie pour éditeurs médicaux et revues scientifiques.'],['Hôpitaux et universités','Supports pédagogiques et de communication pour services médicaux et facultés.'],['Recherche','Figures et schémas pour articles, congrès et présentations.'],['Animation 2D','Processus biologiques et techniques chirurgicales en mouvement.']],
 areas:'Domaines',n:'illustrations',nv:'animations',feat:'Sélection',
 profH:'Profil',prof:['Communicant visuel spécialisé en biomédecine, sciences naturelles et technique, il allie le métier du dessin à une connaissance scientifique et médicale exacte, en techniques traditionnelles et numériques.','Après des études de beaux-arts à la Llotja et à l’Escola Massana, il a été directeur artistique dans des agences de publicité médicale pour des laboratoires. Indépendant depuis 1992, il a collaboré de 1992 à 2005 avec le département d’anatomie de la Faculté de médecine de Barcelone, à Bellvitge.','Il a réalisé des livres d’anatomie, de chirurgie et de microbiologie pour des éditeurs médicaux, des illustrations pour des revues médico-chirurgicales et de vulgarisation, ainsi que des projets de communication visuelle avec des hôpitaux et des facultés d’Espagne et d’Europe.'],
 facts:[['Formation','Beaux-arts · Escola Massana · Llotja'],['Indépendant','Depuis 1992'],['Outils','Illustrator · Photoshop · Animate · PowerPoint'],['Langues','Catalan · espagnol · français · anglais · italien']],
 cliH:'Clients',hos:'Hôpitaux et cliniques',inst:'Universités et institutions',pub:'Éditeurs et revues',resH:'Crédits en recherche',expH:'Expositions d’art médical',
 ctaH:'Un projet en tête ?',ctaP:'Illustration médicale, chirurgicale ou scientifique pour publications, enseignement, congrès ou vulgarisation. Dites-nous ce dont vous avez besoin.',ctaB:'Écrire à l’illustrateur',
 other:'Autres domaines',all:'Illustration médicale',ct:(n,t)=>`${t} — illustration médicale | Pere Lluís León`,cd:(n,i)=>`${i} ${n} de Pere Lluís León, illustrateur médical et scientifique à Barcelone.`,anim:'Animation 2D',play:'Lire'}};

module.exports={CATS,POS,VID,FEAT,HOS,INST,PUB,RES,T};
