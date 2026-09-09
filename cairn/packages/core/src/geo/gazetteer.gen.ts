/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by `node tools/gen-gazetteer.mjs`. Re-run that to change it; a hand edit here is lost
 * on the next run and untraceable to a source in the meantime.
 *
 * Source : nvkelso/natural-earth-vector@v5.1.2/geojson/ne_10m_populated_places.geojson
 *          (Natural Earth populated places, public domain — see the generator's header for the
 *          licence citation and why the tag is pinned rather than tracking `master`.)
 * sha256 : ne_10m_populated_places.geojson 9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b
 * Rows   : 7342 shipped · 2527 admin-1 names · 226 country names
 * Marked : 98 rows carry `indexAgrees: false` — ARCHITECTURE §8.4 **A-83** Part 8, the
 *          consistency invariant RESTATED: *no shipped row may SILENTLY contradict the country
 *          index*. Those rows are border towns the shipped index draws on the wrong side of a
 *          frontier (Geneva, Jerusalem, Brazzaville, Maastricht, Lugano, Arlon…). A-82 Part 5
 *          refused them outright, which cost a national capital and the second city of
 *          Switzerland; they now SHIP carrying the disagreement, and every one is published with
 *          both answers in `fixtures/golden/gazetteer-disagreements.json`. **A row that would
 *          contradict the index without carrying that record is still REFUSED.** Safe only because
 *          `City.placeId` exists (ROADMAP I-22): a PICKED row's country outranks `countryOf`, and
 *          a hand-typed one's does not.
 * Census : 6805 agree with ISO_A2 · 427 countryOf-silent (A-26's honest hole) ·
 *          98 contradicted (shipped, marked) · 12 carry no ISO_A2 at all
 * Order  : ascending folded name, then descending population, then ascending ISO code, then
 *          ascending NE_ID. A **total** order, so a regeneration cannot reshuffle the list, and it
 *          is a property of THIS FILE — `decodeGazetteer` preserves it and does not re-derive it.
 * Coords : 4 decimal places (~11 m), stored as base-36 tenth-thousandths. `countryOf` was
 *          evaluated against the QUANTISED coordinate, so the invariant holds for the bytes that
 *          ship rather than for the ones that were measured.
 * Ids    : every row id is `ne:<base-36 NE_ID>`. The prefix names the dataset that minted it,
 *          because this value is what a `City.placeId` persists (§8.4 A-83 Part 8).
 * Fold   : A-82 Part 3's five ordered steps. Each row carries its own fold, and
 *          `packages/core/test/gazetteer.test.ts` asserts core's `foldPlaceName(row.name)`
 *          reproduces it for every row — which is what makes the generator's own copy of that
 *          algorithm a checked pair rather than a second opinion.
 * Budget : `packages/core/test/0-gazetteerBudget.test.ts`. This module is NOT reachable from
 *          `packages/core/src/index.ts`: it is a **second declared entry point**,
 *          `@cairn/core/gazetteer`, dynamically imported, because unlike `COUNTRY_INDEX` the
 *          gazetteer is not on the write path (A-82 Part 9).
 *
 * The rows live in ONE template literal — one token to Node's type stripping, which is what keeps
 * `node --test packages/core` running the .ts files with no build step — and one row per line, so
 * a moved coordinate is one line of diff on one stable `NE_ID`.
 */
import { decodeGazetteer } from './gazetteer.ts';
import type { Gazetteer } from './gazetteer.ts';

const PACKED = `2527|226|7342
?li Bayramli
Aargau
Aberdeen
Abia
Abkhazia
Abruzzo
Abu Dhabi
Aceh
Achham
Acre
Ad Dakhliyah
Ad Daqahliyah
Ad Dawhah
Adamaoua
Adamawa
Adana
Addis Ababa
Adiyaman
Adjumani
Adrar
Adygey
Afyon
Aga Buryat
Agadez
Agnéby
Agri
Aguascalientes
Agusan del Norte
Ahal
Ahuachapán
Aichi
Ais
Aisén del General Carlos Ibáñez del Campo
Ajaria
Ajdabiya
Akershus
Akita
Akrahreppur
Akureyri
Akwa Ibom
Al Ahmadi
Al Bahr al Ahmar
Al Batnah
Al Bayda'
Al Buhayrah
Al Butnan
Al Dhahira
Al Fayyum
Al Gharbiyah
Al Hizam Al Akhdar
Al Hudaydah
Al Hudud ash Shamaliyah
Al Iskandariyah
Al Isma\`iliyah
Al Jabal al Akhdar
Al Jahrah
Al Jawf
Al Jizah
Al Jufrah
Al Kufrah
Al Kuwayt
Al Madinah
Al Mahrah
Al Marqab
Al Minufiyah
Al Minya
Al Qahirah
Al Qalyubiyah
Al Quassim
Al Qubbah
Al Wadi at Jadid
Al-Anbar
Al-Basrah
Al-Muthannia
Al-Qadisiyah
Alabama
Alagoas
Alajuela
Alaska
Alba
Albay
Alberta
Aleppo (Halab)
Alger
Ali Sabieh
Alibori
Almaty
Alsace
Alta Verapaz
Altay
Alto Paraguay
Alto Paran
Alto Paranp
Amambay
Amanat Al Asimah
Amapi
Amapá
Amasya
Amazonas
Amhara
Amman
Amur
An Giang
An Nabatiyah
An Nuqat al Khams
An-Najaf
Anambra
Anatoliki Makedonia kai Thraki
Ancash
Andalucía
Andaman and Nicobar
Andhra Pradesh
Andijon
Ang Thong
Anhui
Ankara
Annaba
Anseba
Antalya
Antananarivo
Antioquia
Antofagasta
Antsiranana
Antwerp
Anuradhapura
Anzoztegui
Anzoátegui
Aomori
Appenzell Ausserrhoden
Appenzell Innerrhoden
Apulia
Apure
Apurímac
Aqaba
Aqmola
Aqt
Aqtöbe
Aquitaine
Ar Raqqah
Ar Riyad
Arad
Aragatsotn
Aragua
Aragón
Ararat
Arauca
Arbil
Ardebil
Arequipa
Arges
Arhangay
Arica y Parinacota
Arizona
Arkansas
Arkhangel'sk
Arlon
Artigas
Artvin
Arua Municipality
Arunachal Pradesh
Arusha
As Suwayda'
As Suways
As-Sulaymaniyah
Ash Sharqiyah
Ash Shati'
Ashanti
Assaba
Assam
Astara
Astrakhan'
Asunción
Aswa
Aswan
Asyut
At-Ta'mim
Atacama
Atakora
Atlantique
Atlántico
Atlántico Norte
Atlántico Sur
Atlántida
Attapu
Attiki
Atyrau
Auckland
Aust-Agder
Australian Capital Territory
Austur-Hérað
Auvergne
Aveiro
Ayacucho
Aydin
Ayeyarwady
Az Zawiyah
Azores
Azua
Azuay
B?c Giang
B?c Liêu
B?n Tre
BHo-B
BNnh Phu?c
BZchar
Babil
Bacau
Badakhshan
Baden-Württemberg
Badghis
Badulla
Bafatá
Bafing
Baghdad
Baghlan
Bago
Bahia
Bahoruco
Baja California
Baja California Sur
Baja Verapaz
Baki
Bakool
Bali
Balikesir
Balkan
Balkh
Balqa
Balti
Baluchistan
Bamako
Bamingui-Bangoran
Bamunanika
Bamyan
Banaadir
Bandundu
Bangka-Belitung
Bangkok Metropolis
Bangui
Bani Suwayf
Bani Walid
Banjul
Banke
Banskobystrický
Banten
Banwa
Barahona
Baranya
Bari
Barima-Waini
Barinas
Barisal
Bas-Congo
Bas-Sassandra
Basel-Landschaft
Basel-Stadt
Bashkortostan
Basilicata
Basse-Kotto
Basse-Normandie
Batangas
Batdâmbâng
Bath and North East Somerset
Batha
Batman
Batna
Batticaloa
Bauchi
Bay
Bay of Plenty
Bayan-Ölgiy
Bayanhongor
Bayern
Bazéga
Beijing
Beirut
Beja
Belfast
Belgorod
Belize
Bender
Benghazi
Bengkulu
Bengo
Benguela
Benguet
Benshangul-Gumaz
Benue
Berat
Berea
Berlin
Bern
Bet
Bhaktapur
Bhojpur
BiO
Bihar
Bihor
Bilecik
Bingöl
Bioko Norte
Bioko Sur
Bishkek
Biskra
Biskupstungnahreppur
Bissau
Bistrita-Nasaud
Bitlis
Bitola
Bizerte
Bié
Blantyre
Blekinge
Blida
Blue Nile
Boaco
Bocas del Toro
Bogota
Boke
Bokeo
Bol
Bolama
Bolivar
Bolu
Bolívar
Bong
Boqueran
Boquerón
Bordj Bou Arreridj
Borgou
Borno
Borsod-Abaúj-Zemplén
Botosani
Bouenza
Bougouriba
Bouira
Boulgou
Boulkiemdé
Bourgogne
Bournemouth
Boyacá
Braga
Bragança
Braila
Brakna
Brandenburg
Brasov
Bratislavský
Bremen
Brest
Bretagne
Brighton and Hove
Bristol
British Columbia
Brodsko-Posavska
Brokopondo
Brong Ahafo
Brugge
Brunei and Muara
Brussels
Bryansk
Bubanza
Bucharest
Budadiri
Budapest
Bujumbura Mairie
Bukhoro
Bulawayo
Bulgan
Bungokho
Bur Sa\`id
Burdur
Burgas
Burgenland
Buri Ram
Bursa
Bururi
Buryat
Busan
Bushehr
Busia
Buskerud
Busujju
Buzau
Bà R?a - Vung Tàu
Bács-Kiskun
Bântéay Méanchey
Béchar
Béja
Béjaïa
Békés
Bình Duong
Bình Thu?n
Bình Ð?nh
Bío-Bío
CRrdoba
Caaguazú
Caazapa
Caazapá
Cabañas
Cabinda
Cabo Delgado
Cacheu
Cagayan
Cahul
Cajamarca
Calabria
Calarasi
Caldas
California
Callao
Camagüey
Camarines Sur
Cambridgeshire
Campania
Campeche
Canelones
Canindey
Canindeyú
Cankuzo
Cantabria
Canterbury
Cao B?ng
Capiz
Caprivi
Caqueti
Caquetá
Carabobo
Caras-Severin
Carazo
Carchi
Cardiff
Cartago
Casanare
Castelo Branco
Castilla y León
Castilla-La Mancha
Cataluña
Catamarca
Cauca
Cayo
Cañar
Ceará
Cebu
Centar
Central
Central Equatoria
Central Finland
Centre
Centro Sur
Cerro Largo
Cesar
Ceuta
Chachoengsao
Chaco
Chagang-do
Chahar Mahall and Bakhtiari
Chai Nat
Chaiyaphum
Chalatenango
Champagne-Ardenne
Champasak
Chandigarh
Changhua
Chanthaburi
Chaouia - Ouardigha
Chardzhou
Charleroi
Chatham Is. aggregation
Chechnya
Chelyabinsk
Cherkasy
Chernihiv
Chernivtsi
Cheshire
Chhattisgarh
Chiang Mai
Chiang Rai
Chiapas
Chiayi
Chiayi City
Chihuahua
Chimaltenango
Chimborazo
Chimbu
Chin
Chinandega
Chiquimula
Chiradzulu
Chiriquí
Chisinau
Chita
Chitipa
Chittagong
Chlef
Chocó
Choiseul
Choluteca
Chon Buri
Chongqing
Chontales
Chubut
Chukchi Autonomous Okrug
Chumphon
Chungcheongbuk-do
Chuquisaca
Chuvash
Ciego de Ávila
Cienfuegos
City of St. Petersburg
Ciudad de Buenos Aires
Ciudad de la Habana
Clare
Clarendon
Cluj
Coahuila
Coast
Cochabamba
Coclé
Coimbra
Cojedes
Colima
Colombo
Colonia
Colorado
Colón
Comayagua
Commewijne
Comunidad Foral de Navarra
Comunidad Valenciana
Comunidad de Madrid
Conakry
Concepción
Connecticut
Constanta
Constantine
Copperbelt
Copán
Coquimbo
Cordillera
Cork
Cornwall
Coronie
Corozal
Corrientes
Corse
Cortés
Cotopaxi
Covasna
Cquateur
Crimea
Cross River
Csongrád
Cuando Cubango
Cuanza Norte
Cuanza Sul
Cumbria
Cundinamarca
Cunene
Cuscatlán
Cusco
Cuvette
Cuvette-Ouest
Cuyuni-Mazaruni
Cà Mau
Córdoba
Dadra and Nagar Haveli
Daegu
Daejeon
Dagestan
Dajabón
Dak Lak
Dakar
Dakhlet Nouadhibou
Dalarna
Damascus
Dar-Es-Salaam
Dar\`a
Darién
Daugavpils
Davao Del Sur
Davao del Norte
Dayr Az Zawr
Debub
Debubawi Keyih Bahri
Dedza
Delaware
Delhi
Delta
Denguélé
Denizli
Derry
Devon
Dhaka
Dhamar
Dhawalagiri
Dhi-Qar
Dhofar
Dibër
Diekirch
Diffa
Dihok
Dikhil
Dili
Dinagat Islands
Diourbel
Dire Dawa
District of Columbia
Distrito Capital
Distrito Federal
Distrito Nacional
Dix-Huit Montagnes
Diyala
Diyarbakir
Djelfa
Djibouti
Dnipropetrovs'k
Dobrich
Dodoma
Dolj
Donegal
Donets'k
Donga
Dornod
Dornogovi
Dosso
Doukkala - Abda
Drenthe
Duarte
Dubay
Dublin
Dubrovacko-Neretvanska
Dumfries and Galloway
Dumyat
Dundee
Dundgovi
Dungannon
Durango
Durazno
Durrës
Dytiki Ellada
Dzavhan
Dâmbovita
East Azarbaijan
East Berbice-Corentyne
East Equatoria
East Flanders
East Kazakhstan
East New Britain
East Sepik
Eastern
Eastern Cape
Eastern Finland
Eastern Highlands
Eastern Uusimaa
Edinburgh
Edirne
Edo
Ehime
Ekiti
El Bayadh
El Beni
El Oro
El Paraíso
El Progreso
El Seybo
Elazig
Elbasan
Elias Pina
Emilia-Romagna
Enga
Entre Ríos
Enugu
Erevan
Erongo
Erzincan
Erzurum
Escuintla
Esfahan
Eskisehir
Esmeraldas
Espaillat
Espírito Santo
Essequibo Islands-West Demerara
Est
Estelí
Estuaire
Evenk
Extremadura
Extrême-Nord
Eysturoyar
F.A.T.A.
F.C.T.
Falcón
Farah
Faranah
Faro
Fars
Faryab
Fatick
Federal Capital Territory
Fejér
Ferghana
Fianarantsoa
Fier
Finland Proper
Finnmark
Finström
Flores
Florida
Formosa
Franche-Comté
Francisco Morazán
Fribourg
Friesland
Friuli-Venezia Giulia
Fromager
Fujayrah
Fujian
Fukui
Fukuoka
Fukushima
Fès - Boulemane
G?d?b?y
G?nc?
Gabès
Gabú
Gafsa
Gal
Galati
Galguduud
Galicia
Galle
Galway
Galápagos
Gangwon-do
Gansu
Ganzourgou
Gao
Gash Barka
Gauteng
Gaza
Gaziantep
Gedarif
Gedo
Gegharkunik
Gelderland
Genève
Georgia
Gezira
Ghadamis
Ghanzi
Gharb - Chrarda - Béni Hssen
Ghardaaa
Ghat
Ghazni
Ghor
Gia Lai
Gibraltar
Gifu
Gilan
Giresun
Gisborne
Giurgiu
Gjirokastër
Glarus
Glasgow
Gnagna
Goa
Goi
Goiás
Golan
Golestan
Gombe
Goranboy
Gorj
Gorkha
Gorno-Altay
Gorno-Badakhshan
Gorontalo
Gotland
Gourma
Govi-Altay
Gracias a Dios
Grad Beograd
Grad Sofiya
Grad Zagreb
Granada
Grand Bassa
Grand Cape Mount
Grand Casablanca
Grand'Anse
GrandGedeh
GrandKru
Granma
Graubünden
Greater Accra
Greater Poland
Grevenmacher
Groningen
Guadalcanal
Guadeloupe
Guainía
Guairá
Guanacaste
Guanajuato
Guangdong
Guangxi
Guantánamo
Guarda
Guatemala
Guayas
Guelma
Guelmim - Es-Semara
Guerrero
Guidimaka
Guinaa
Guizhou
Gulf
Gunma
Guárico
Guéra
Gwangju
Gyeonggi-do
Gyeongsangnam-do
Gyor-Moson-Sopron
Gävleborg
Göyçay
Gümüshane
H? Chí Minh city
H?i Duong
Ha Tinh
Ha'il
HaDarom
HaMerkaz
HaZafon
Hadjer-Lamis
Hadramawt
Haifa
Hainan
Hainaut
Hajdú-Bihar
Hajjah
Hakkari
Halland
Hamadan
Hamah
Hamburg
Hamgyong-bukto
Hamgyong-namdo
Hanover
Harare
Hardap
Harghita
Harju
Haryana
Hasaka (Al Haksa)
Haskovo
Hatay
Hato Mayor
Haut-Mbomou
Haut-Ogooué
Haut-Sassandra
Haute-Kotto
Haute-Normandie
Hawaii
Hawalli
Hebei
Hedmark
Heilongjiang
Henan
Hentiy
Heredia
Hermanas
Herrera
Herzegovina-Neretva
Hessen
Heves
Hhohho
Hidalgo
Highland
Hiiraan
Hilmand
Himachal Pradesh
Hirat
Hiroshima
Hodh ech Chargui
Hodh el Gharbi
Hokkaido
Holguín
Homs (Hims)
Homyel'
Hordaland
Hormozgan
Houaphan
Houet
Hovd
Hovedstaden
Hrodna
Hsinchu
Hsinchu City
HuOla
HuRnuco
Hualien
Huambo
Huancavelica
Hubei
Huehuetenango
Huila
Hunan
Hunedoara
Huánuco
Huíla
Hwanghae-bukto
Hwanghae-namdo
Hyogo
Hà Giang
Hà Tây
Hòa Bình
Hövsgöl
Ialomita
Iasi
Ibaraki
Ibb
Ica
Ida-Viru
Idaho
Idlib
Iganga
Ilam
Illinois
Illizi
Ilocos Norte
Ilocos Sur
Iloilo
Imbabura
Imereti
Imo
Inch'on-gwangyoksi
Inchiri
Independencia
Indiana
Ingush
Inhambane
Intibucá
Inverclyde
Ionioi Nisoi
Iowa
Ipeiros
Irbid
Irian Jaya Barat
Iringa
Irkutsk
Ishikawa
Isla de la Juventud
Islas Baleares
Islas de la Bahía
Isparta
Istanbul
Istarska
Itapga
Itapúa
Ivano-Frankivs'k
Ivanovo
Iwate
Izabal
Izmir
Jaffna
Jakarta Raya
Jalal-Abad
Jalapa
Jalisco
Jambi
Jammu and Kashmir
Janakpur
Janub Sina'
Jawa Barat
Jawa Tengah
Jawa Timur
Jawzjan
Jeju
Jelgava
Jendouba
Jeollabuk-do
Jerusalem
Jharkhand
Jiangsu
Jiangxi
Jigawa
Jihoceský
Jijel
Jilin
Jinja
Jinotega
Jizan
Jizzakh
Johor
Jubbada Dhexe
Jubbada Hoose
Jujuy
Jungoli
Junín
Jura
Jutiapa
Južno-Backi
Jász-Nagykun-Szolnok
Jämtland
Jönköping
K. Maras
Kaabong
Kabale
Kabardin-Balkar
Kabarole
Kaberamaido
Kabul
Kachin
Kadiogo
Kaduna
Kaesong
Kafr ash Shaykh
Kagawa
Kagera
Kagoshima
Kairouan
Kalangala
Kalasin
Kalimantan Barat
Kalimantan Selatan
Kalimantan Tengah
Kalimantan Timur
Kaliningrad
Kalmar
Kalmyk
Kaluga
Kamchatka
Kampala
Kamphaeng Phet
Kamuli
Kanagawa
Kanchanaburi
Kandahar
Kandy
Kanem
Kangwon-do
Kankan
Kano
Kansas
Kaohsiung City
Kaolack
Kapisa
Kara
Karachay-Cherkess
Karak
Karakalpakstan
Karaman
Karas
Karbala'
Karelia
Karlovacka
Karlovarský
Karnali
Karnataka
Kars
Karuzi
Kasao-Occidental
Kasaï-Occidental
Kasaï-Oriental
Kasese
Kashari
Kashkadarya
Kaskazini-Pemba
Kaskazini-Unguja
Kassala
Kasssrine
Kassérine
Kastamonu
Katanga
Katsina
Kauno
Kavango
Kayah
Kayanza
Kayes
Kayin
Kayseri
Kayunga
Kaôh Kong
Kebbi
Kebili
Kedah
Keelung City
Kelantan
Kemerovo
Kent
Kentriki Makedonia
Kentucky
Kepulauan Riau
Kerala
Kerman
Kermanshah
Kerry
Kgalagadi
Kgatleng
Khabarovsk
Khakass
Khammouan
Khanty-Mansiy
Kharkiv
Khartoum
Khatlon
Khmel'nyts'kyy
Khomas
Khon Kaen
Khorezm
Khulna
Khuzestan
Khánh Hòa
Kibale
Kiboga
Kidal
Kiev
Kigali City
Kigoma
Kilimanjaro
Kilinochchi
Kilkenny
Kindia
Kingston
Kingston upon Hull
Kinkkale
Kinshasa City
Kirklareli
Kirov
Kirovohrad
Kirsehir
Kirundo
Kisoro
Kitgum
Kiên Giang
Klaipedos
Kocaeli
Kochi
Kogi
Kohgiluyeh and Buyer Ahmad
Kolda
Komi
Komi-Permyak
Kommune Kujalleq
Kommuneqarfik Sermersooq
Komoé
Komárom-Esztergom
Konya
Kor
Kordestan
Koryak
Korçë
Kossi
Kostroma
Kouilou
Kouritenga
Košický
Krabi
Kraj Vysocina
Krasnodar
Krasnoyarsk
Kriti
Kronoberg
Královéhradecký
Krâchéh
Kukës
Kumamoto
Kumi
Kuna Yala
Kunar
Kunduz
Kunene
Kurgan
Kursk
Kusini-Pemba
Kuyavian-Pomeranian
Kvemo Kartli
KwaZulu-Natal
Kwangju-gwangyoksi
Kwara
Kweneng
Kyoto
Kyustendil
Kâmpóng Cham
Kâmpóng Chhnang
Kâmpóng Spœ
Kâmpóng Thum
Kâmpôt
Kärnten
Kémo
Kénédougou
Kütahya
L'Artibonite
L'viv
L?ng Son
La Altagracia
La Araucanpa
La Araucanía
La Guajira
La Habana
La Libertad
La Pampa
La Paz
La Rioja
La Romana
La Réunion
La Unión
La Vega
LaRyoune - Boujdour - Sakia El Hamra
Labe
Lac
Lacs
Ladakh
Laghman
Laghouat
Lagos
Laguna
Lagunes
Lahij
Lakes
Lakshadweep
Lambayeque
Lampang
Lamphun
Lampung
Lanao del Norte
Lancashire
Languedoc-Roussillon
Lapland
Lara
Larnaca
Las Tunas
Latgale
Lattakia (Al Ladhiqiyah)
Lavalleja
Lazio
Laâyoune - Boujdour - Sakia El Hamra
Le Kef
Leicester
Leiria
Lempira
Leninabad
Leningrad
Leribe
Lesser Poland
Leyte
Lezhë
León
Liaoning
Liberecký
Libertador General Bernardo O'Higgins
Liege
Liepaja
Liguria
Likouala
Lilongwe
Lima
Limassol
Limburg
Limerick
Limousin
Limpopo
Limón
Lindi
Lipetsk
Lira
Lisboa
Litoral
Littoral
Lobaye
Loei
Lofa
Logar
Logone Oriental
Loja
Lombardia
Long An
Lop Buri
Lorestan
Loreto
Lori
Lorraine
Los Lagos
Los R
Los Rios
Los Ríos
Los Santos
Louang Namtha
Louangphrabang
Louga
Louisiana
Louth
Lovech
Lower River
Lower Silesian
Luanda
Luapula
Lublin
Lubombo
Lubusz
Lucerne
Luhans'k
Lumbini
Lunda Norte
Lunda Sul
Lusaka
Luton
Luxembourg
Lào Cai
Lâm Ð?ng
Lääne
Lékoumou
Lódz
M'Sila
MOre og Romsdal
MUdenine
Ma'rib
Ma\`an
Maccarthy Island
Machinga
Madang
Madeira
Madhya Pradesh
Madre de Dios
Madriz
Mae Hong Son
Maekel
Mafeteng
Mafraq
Maga Buryatdan
Magallanes y Antartica Chilena
Magallanes y Antártica Chilena
Magdalena
Magway
Maha Sarakham
Mahaica-Berbice
Mahajanga
Mahakali
Maharashtra
Mahdia
Mahilyow
Maine
Makamba
Makkah
Malanje
Malatya
Malborough
Maldonado
Maluku
Maluku Utara
Mambéré-Kadéï
Mamou
Manabi
Managua
Manawatu-Wanganui
Manchester
Mandalay
Mandoul
Mangghystau
Mangochi
Manica
Manicaland
Maniema
Manipur
Manisa
Manitoba
Manubah
Manus
Manzini
Maputo
Mara
Maradi
Marahoué
Maramures
Maranh
Maranhão
Marche
Mardin
Margibi
Maribor
Maritime
Mariy-El
Markazi
Marlborough
Marowijne
Marrakech - Tensift - Al Haouz
Martinique
Mary
Maryland
María Trinidad Sánchez
Masaka
Masaya
Mascara
Maseru
Mashonaland Central
Mashonaland West
Masindi
Masovian
Massachusetts
Masvingo
Matabeleland North
Matabeleland South
Matagalpa
Matam
Matanzas
Matara
Mato Grosso
Mato Grosso do Sul
Matruh
Maule
Mayo-Kebbi Est
Maysan
Mazandaran
Mbeya
Mbomou
Mchinji
Mechi
Mecklenburg-Vorpommern
Meghalaya
Mehedinti
Mekncs - Tafilalet
Meknès - Tafilalet
Melaka
Melilla
Mendoza
Merseyside
Mersin
Meta
Metropolitan Manila
Miaoli
Michigan
Michoacán
Midi-Pyrénées
Midlands
Midtjylland
Mie
Milne Bay
Minas Gerais
Minnesota
Minsk
Miranda
Misamis Occidental
Misamis Oriental
Misiones
Misratah
Mississippi
Missouri
Miyagi
Miyazaki
Mizdah
Mizoram
Mohale's Hoek
Mokhotlong
Molise
Mon
Monagas
Monaghan
Monastir
Mono
Monseñor Nouel
Montana
Monte Cristi
Monte Plata
Montevideo
Montserrado
Mopti
Moquegua
Moravicki
Moravskoslezský
Moray
Morazán
Mordovia
Morelos
Morobe
Morogoro
Morona Santiago
Moroto
Moskovsskaya
Moskva
Mostaganem
Mou Houn
Mount Lebanon
Moxico
Moyen-Cavally
Moyen-Comoe
Moyen-Ogooul
Moyen-Ogooué
Moyo
Moyotte
Mpigi
Mpumalanga
Mtwara
Mubende
Mudug
Mugla
Mulanje
Muramvya
Mures
Murmansk
Murzuq
Mus
Muscat
Muyinga
Mwanza
Mykolayiv
Mzimba
Médenine
Médéa
Mérida
México
Môndól Kiri
Møre og Romsdal
N'zi-Comoé
N.W.F.P.
Nabeul
Nagaland
Nagano
Nagasaki
Nahouri
Nairobi
Najran
Nakasongola
Nakhon Nayok
Nakhon Pathom
Nakhon Phanom
Nakhon Ratchasima
Nakhon Sawan
Nakhon Si Thammarat
Nam n?nh
Namangan
Namentenga
Namibe
Namp'o-si
Nampula
Namur
Nan
Nana-Grébizi
Nana-Mambéré
Nangarhar
Nantou
Napo
Narathiwat
Narayani
Nariño
Naryn
Nassa
Nassarawa
Nationalparken
Navoi
Naxçivan
Nayarit
Naâma
Neamt
Nebbi
Nebraska
Negeri Sembilan
Negros Occidental
Nei Mongol
Nelson
Nenets
Neuchâtel
Neuqutn
Neuquén
Nevada
Nevsehir
New Brunswick
New Hampshire
New Ireland
New Jersey
New Mexico
New South Wales
New Taipei City
New York
Newfoundland and Labrador
Ngh? An
Ngounié
Ngozi
Niamey
Niari
Nicaragua
Nickerie
Nidwalden
Niedersachsen
Niederösterreich
Nigde
Niger
Niigata
Nimba
Nimroz
Ninawa
Ningxia Hui
Ninh Bmnh
Ninh Thu?n
Niue aggregation
Nizhegorod
Nišavski
Nkhata Bay
Nkhotakota
Nong Khai
Nonthaburi
Noord-Brabant
Noord-Holland
Nord
Nord-Est
Nord-Kivu
Nord-Ouest
Nord-Pas-de-Calais
Nord-Trøndelag
Nordjylland
Nordland
Nordrhein-Westfalen
Norfolk
Norrbotten
Norte de Santander
North Bahr-al-Ghazal
North Carolina
North Dakota
North Karelia
North Kazakhstan
North Khorasan
North Kurdufan
North Lebanon
North Ossetia
North Solomons
North West
North Yorkshire
North-Eastern
North-West
North-Western
Northern
Northern Areas
Northern Cape
Northern Darfur
Northern Ostrobothnia
Northern Territory
Northland
Northwest Territories
Notio Aigaio
Nottingham
Nouakchott
Nova Scotia
Novgorod
Novosibirsk
Nsanje
Ntcheu
Ntungamo
Nueva Ecija
Nueva Esparta
Nueva Segovia
Nuevo León
Nugaal
Nunavut
Nusa Tenggara Barat
Nusa Tenggara Timur
Nyanga
Nyanza
Nzerekore
Nógrád
Oaxaca
Oberösterreich
Obock
Obwalden
Ocotepeque
Odessa
Ogoou
Ogooué-Ivindo
Ogooué-Lolo
Ogooué-Maritime
Ogun
Oguz
Ohangwena
Ohio
Oio
Oita
Okayama
Okinawa
Oklahoma
Olancho
Olt
Omagh
Omaheke
Omsk
Ondo
Ontario
Opole
Oppland
Oran
Orange Free State
Orange Walk
Ordu
Orebro
Oregon
Orel
Orenburg
Orhon
Oriental
Orientale
Orissa
Oruro
Osaka
Osh
Oshana
Oshikoto
Osjecko-Baranjska
Oslo
Osrednjeslovenska
Osun
Otago
Otjozondjupa
Ouaddaï
Ouaka
Ouargla
Oubritenga
Oudalan
Oued el Dahab
Ouest
Ouham
Ouham-Pendé
Oum el Bouaghi
Ouémé
Overijssel
Oxfordshire
Oyo
P'yongan-bukto
P'yongan-namdo
P'yongyang
Pahang
Paktika
Paktya
Palawan
Pallisa
Pampanga
Panama
Panevezio
Pangasinan
Paphos
Papua
Par
Para
Paraguarí
Paramaribo
Paraná
Paraíba
Parwan
Pará
Pasco
Passoré
Pastaza
Pathum Thani
Pattani
Pavlodar
Pays de la Loire
Paysandú
País Vasco
Pedernales
Peembucy
Peloponnisos
Penghu
Pennsylvania
Penza
Perak
Peravia
Perlis
Perm'
Pernambuco
Pernik
Perthshire and Kinross
Pest
Peterborough
Petén
Phangnga
Phatthalung
Phayao
Phetchabun
Phetchaburi
Phichit
Phitsanulok
Phnom Penh
Phra Nakhon Si Ayutthaya
Phrae
Phuket
Phôngsali
Phú Th?
Phú Yên
Piauí
Picardie
Pichincha
Piemonte
Pinar del Río
Pingtung
Pirkanmaa
Piura
Plateau
Plateaux
Pleven
Plovdiv
Plymouth
Podgorica
Podlachian
Poitou-Charentes
Poltava
Pomeranian
Pomeroon-Supenaam
Poni
Pool
Port of Spain
Portalegre
Portland
Porto
Portsmouth
Portuguesa
Potosi
Potosí
Pouthisat
Prachin Buri
Prachuap Khiri Khan
Prague
Prahova
Preah Vihéar
Presidente Hayes
Prey Ving
Prešov
Primor'ye
Primorsko-Goranska
Prince Edward Island
Principado de Asturias
Pristina
Prizren
Provence-Alpes-Côte-d'Azur
Pskov
Puducherry
Puebla
Puerto Plata
Pulau Pinang
Punakha
Punjab
Puntarenas
Puttalam
Putumayo
Pwani
Päijänne Tavastia
Pärnu
Q?b?l?
Qaasuitsup Kommunia
Qaraghandy
Qazvin
Qeqqata Kommunia
Qina
Qom
Qostanay
Qu?ng Bình
Qu?ng Nam
Qu?ng Ngãi
Qu?ng Ninh
Qu?ng Tr?
Queensland
Querétaro
Quezaltenango
Quiché
Quinara
Quindío
Quintana Roo
Quthing
Québec
Qyzylorda
RRo Negro
Rabat - Salé - Zemmour - Zaer
Rajasthan
Rajshahi
Rakhine
Ranong
Rapti
Ras Al Khaymah
Ratchaburi
Ratnapura
Rayong
Razavi Khorasan
Razgrad
Red Sea
Región Metropolitana de Santiago
Región de Murcia
Retalhuleu
Rheinland-Pfalz
Rhode Island
Rhône-Alpes
Riau
Rift Valley
Riga
Rio Grande do Norte
Rio Grande do Sul
Rio de Janeiro
Risaralda
River Cess
River Nile
Rivera
Rivers
Rivne
Rize
Rocha
Rogaland
Roi Et
Rondinia
Rondônia
Roraima
Roscommon
Rostov
Rukwa
Ruse
Rutana
Ruvuma
Ruyigi
Ryanggang
Ryazan'
Río Negro
Rôtânôkiri
S?ki
SZtif
Sa Kaeo
Sa\`dah
Saarland
Sabah
Sabha
Sacatepéquez
Sachsen
Sachsen-Anhalt
Sagaing
Sagarmatha
Saint Andrew
Saint Ann
Saint Catherine
Saint Elizabeth
Saint George
Saint James
Saint Mary
Saint Michael
Saint Thomas
Saitama
Sakarya
Sakha (Yakutia)
Sakhalin
Sakon Nakhon
Sala ad-Din
Salaj
Salamat
Salima
Salta
Salto
Salzburg
Samangan
Samaná
Samar
Samara
Samarkand
Samegrelo-Zemo Svaneti
Samsun
Samut Prakan
Samut Sakhon
Samut Songkhram
San Cristóbal
San Fernando
San José
San Juan
San Luis
San Luis Potosí
San Marcos
San Mart
San Martín
San Miguel
San Pedro
San Pedro de Macorís
San Salvador
San Vicente
Sancti Spíritus
Sandaun
Sangha
Sangha-Mbaéré
Sanguié
Sankt Gallen
Sanliurfa
Sanma
Sanmatenga
Santa Ana
Santa Bárbara
Santa Catarina
Santa Cruz
Santa Fe
Santa Rosa
Santander
Santarém
Santiago
Santiago Rodríguez
Santiago de Cuba
Santiago del Estero
Saraburi
Sarajevo
Saramacca
Saratov
Saravan
Sarawak
Sardegna
Saskatchewan
Satakunta
Satu Mare
Satun
Savanes
Savannakhét
Saïda
Schaffhausen
Schleswig-Holstein
Schwyz
Selangor
Selenge
Semenawi Keyih Bahri
Semnan
Sennar
Seoul
Serbian Republic
Sergipe
Severno-Backi
Sfax
Shaanxi
Shabeellaha Dhexe
Shabeellaha Hoose
Shabwah
Shamal Sina'
Shan
Shandong
Shanghai
Shanxi
Shariff Kabunsuan
Sharjah
Shefa
Shida Kartli
Shiga
Shimane
Shinyanga
Shirak
Shiselweni
Shizuoka
Shkodër
Shumen
Si Sa Ket
Sibiu
Sichuan
Sicily
Sidi Bel Abbès
Sidi Bou Zid
Siemréab
Siirt
Sikasso
Sikkim
Silesian
Siliana
Sinaloa
Sind
Sing Buri
Singida
Sinoe
Sinop
Sipaliwini
Sirdaryo
Sissili
Sistan and Baluchestan
Sivas
Sjaælland
Skikda
Skåne
Sligo
Sliven
Smolensk
Sofala
Sogn og Fjordane
Sokoto
Sololá
Solothurn
Somali
Somogy
Son La
Songkhla
Songkhla (Songkhla Lake)
Sonora
Sonsonate
Soriano
Soroti
Souk Ahras
Soum
Sourou
Souss - Massa - Draâ
Sousse
South Australia
South Ayrshire
South Carolina
South Cotabato
South Dakota
South Darfur
South I. remainder
South Karelia
South Kazakhstan
South Khorasan
South Kordofan
South Kordufan
South Lebanon
South Yorkshire
South-East
Southampton
Southend-on-Sea
Southern
Southern Finland
Southern Highlands
Southern Nations, Nationalities and Peoples
Southern Savonia
Southland
Splitsko-Dalmatinska
Srednje-Banatski
StMng Tr
Stann Creek
Stara Zagora
Stavropol'
Steiermark
Stereá Elláda
Stockholm
Stockton-on-Tees
Stoke-on-Trent
Subcarpathian
Suceava
Suchitepéquez
Sucre
Sud
Sud-Bandama
Sud-Comoé
Sud-Est
Sud-Kivu
Sud-Ouest
Suffolk
Suhaj
Sukhothai
Sulawesi Barat
Sulawesi Selatan
Sulawesi Tengah
Sulawesi Tenggara
Sulawesi Utara
Sumatera Barat
Sumatera Selatan
Sumatera Utara
Sumqayit
Sumy
Suphan Buri
Surat Thani
Surin
Surkhandarya
Surt
Suðurnes
Svalbard
Svay Rieng
Sveitarfélagið Hornafjörður
Sverdlovsk
Swansea
Swietokrzyskie
Syddanmark
Sylhet
Szabolcs-Szatmár-Bereg
Sánchez Ramírez
São Paulo
Ségou
Séno
Sóc Trang
Södermanland
Sør-Trøndelag
Sühbaatar
TZbessa
Ta\`izz
Tabasco
Tabora
Tabuk
Tacna
Tacuarembó
Tadjourah
Tadzhikistan Territories
Taegu-gwangyoksi
Tafilah
Tagant
Tahoua
Taichung City
Tainan City
Taipei City
Taitung
Tajura' wa an Nawahi al Arba
Tak
Takhar
Talas
Tamanghasset
Tamaulipas
Tambacounda
Tambov
Tamil Nadu
Tandjilé
Tanga
Tanger - Tétouan
Tanintharyi
Taoyuan
Tapoa
Taraba
Taranaki
Tarapac
Tarapace
Tarapacm
Tarapacá
Tarija
Tarlac
Tartu
Tartus
Tashauz
Tashkent
Tasmania
Tataouine
Tatarstan
Tavastia Proper
Tavush
Taymyr
Taza - Al Hoceima - Taounate
Tbilisi
Tehran
Tekirdag
Tel Aviv
Telangana
Telemark
Teleorman
Temotu
Tennessee
Ternopil'
Tete
Tetovo
Texas
Th?a Thiên - Hu?
ThMi Bmnh
Thanh H
Thessalia
Thimphu
Thiès
Thurgau
Thái Nguyên
Thüringen
Tianjin
Tiaret
Ticino
Tierra del Fuego
Tigray
Timbuktu
Timis
Tindouf
Tiris Zemmour
Tirol
Tizi Ouzou
Tlaxcala
Tlemcen
Toamasina
Tocantins
Tochigi
Tokat
Tokelau aggregation
Tokushima
Tokyo
Toledo
Toliary
Tolima
Tolna
Tombali
Tomsk
Tororo
Toscana
Totonicapán
Tottori
Tovuz
Toyama
Tozeur
TrM Vinh
Trabzon
Trang
Transcarpathia
Transnistria
Trarza
Trat
Treinta y Tres
Trelawny
Trengganu
Trentino-Alto Adige
Trincomalee
Tripura
Trnavský
Troms
Trujillo
Tucumtn
Tucumán
Tula
Tumbes
Tunceli
Tungurahua
Tunis
Tuva
Tuyên Quang
Tuzla
Tver'
Tyne and Wear
Tyumen'
Táchira
Tây Ninh
Töv
UGge
Ubon Ratchathani
Ucayali
Udmurt
Udon Thani
Ul'yanovsk
Ulaanbaatar
Ulsan
Umbria
Umm Al Qaywayn
Unity
Upper Demerara-Berbice
Upper East
Upper Nile
Upper River
Upper Takutu-Upper Essequibo
Upper West
Uppsala
Uri
Uruzgan
Usak
Ust-Orda Buryat
Usuk
Usulután
Utah
Uthai Thani
Utrecht
Uttar Pradesh
Uttaradit
Uttaranchal
Uvs
Uíge
Vakaga
Valais
Valle
Valle d'Aosta
Valle del Cauca
Vallée du Bandama
Valparaíso
Valverde
Van
Vargas
Varna
Vas
Vaslui
Vaud
Vaupés
Vayots Dzor
Veliko Tarnovo
Veneto
Ventspils
Veracruz
Veraguas
Vermont
Vest-Agder
Vestfirðir
Vestfold
Vesturland
Veszprém
Vi?n Bi
Viana do Castelo
Vichada
Victoria
Vientiane [prefecture]
Vila Real
Viljandi
Villa Clara
Vilniaus
Vinh Long
Vinnytsya
Virginia
Viseu
Vitsyebsk
Vladimir
Vlorë
Volgograd
Vologda
Volta
Volyn
Vorarlberg
Voreio Aigaio
Voronezh
Vrancea
Vratsa
Vâlcea
Värmland
Västerbotten
Västernorrland
Västmanland
Västra Götaland
Wadi Fira
Waikato
Wakayama
Wakiso
Wangdi Phodrang
Warap
Wardak
Warmian-Masurian
Washington
Wasit
Wele-Nzás
Wellington
West Azarbaijan
West Bahr-al-Ghazal
West Bengal
West Coast
West Darfur
West Equatoria
West Kazakhstan
West Midlands
West New Britain
West Pomeranian
West Virginia
West Yorkshire
Western
Western Australia
Western Cape
Western Finland
Western Highlands
Westminster
Westmoreland
White Nile
Wien
Wisconsin
Worodougou
Wouleu-Ntem
Wyoming
Xaignabouri
Xiangkhoang
Xinjiang Uygur
Xizang
Xocali
Yagha
Yala
Yamagata
Yamaguchi
Yamal-Nenets
Yamanashi
Yangon
Yaracuy
Yaroslavl'
Yasothon
Yatenga
Yazd
Yevlax
Yevrey
Yilan
Yobe
Yogyakarta
York
Yoro
Yozgat
Ysyk-Köl
Yucatán
Yukon
Yunlin
Yunnan
Yên Bái
Z?ngilan
Zabul
Zacapa
Zacatecas
Zadarska
Zaghouan
Zaire
Zala
Zambales
Zambezia
Zamboanga Del Sur
Zamboanga del Sur
Zamfara
Zamora Chinchipe
Zanjan
Zanzan
Zanzibar West
Zaporizhzhya
Zarqa
Zeeland
Zenica-Doboj
Zhambyl
Zhejiang
Zhytomyr
Ziguinchor
Zinder
Zinguldak
Ziro
Zomba
Zou
Zoundwéogo
Zug
Zuid-Holland
Zulia
Zürich
\`Adan
\`Asir
d?ng b?ng sông C?u Long
Ãstfold
Çanakkale
Çankiri
Çorum
Équateur
Évora
Île-de-France
Ð?ng Tháp
Ðakovica
Ðà N?ng
Ðông B?c
Ðông Nam B?
Ñuble
Ömnögovi
Östergötland
Övörhangay
Šiauliai
Šibensko-Kninska
Šumadijski
Žilinský
AD Andorra
AE United Arab Emirates
AF Afghanistan
AG Antigua and Barbuda
AL Albania
AM Armenia
AO Angola
AQ Antarctica
AR Argentina
AS American Samoa
AT Austria
AU Australia
AW Aruba
AX Aland
AZ Azerbaijan
BA Bosnia and Herzegovina
BB Barbados
BD Bangladesh
BE Belgium
BF Burkina Faso
BG Bulgaria
BH Bahrain
BI Burundi
BJ Benin
BM Bermuda
BN Brunei
BO Bolivia
BR Brazil
BS The Bahamas
BT Bhutan
BW Botswana
BY Belarus
BZ Belize
CA Canada
CD Congo (Kinshasa)
CF Central African Republic
CG Congo (Brazzaville)
CH Switzerland
CI Ivory Coast
CK Cook Islands
CL Chile
CM Cameroon
CN China
CO Colombia
CR Costa Rica
CU Cuba
CV Cape Verde
CW Curacao
CY Cyprus
CZ Czechia
DE Germany
DJ Djibouti
DK Denmark
DM Dominica
DO Dominican Republic
DZ Algeria
EC Ecuador
EE Estonia
EG Egypt
EH Western Sahara
ER Eritrea
ES Spain
ET Ethiopia
FI Finland
FJ Fiji
FK Falkland Islands
FM Federated States of Micronesia
FO Faroe Islands
FR France
GA Gabon
GB United Kingdom
GD Grenada
GE Georgia
GF France
GH Ghana
GI Gibraltar
GL Greenland
GM The Gambia
GN Guinea
GP France
GQ Equatorial Guinea
GR Greece
GS South Georgia and the Islands
GT Guatemala
GU Guam
GW Guinea Bissau
GY Guyana
HK Hong Kong S.A.R.
HN Honduras
HR Croatia
HT Haiti
HU Hungary
ID Indonesia
IE Ireland
IL Israel
IM Isle of Man
IN India
IQ Iraq
IR Iran
IS Iceland
IT Italy
JM Jamaica
JO Jordan
JP Japan
KE Kenya
KG Kyrgyzstan
KH Cambodia
KI Kiribati
KM Comoros
KN Saint Kitts and Nevis
KP North Korea
KR South Korea
KW Kuwait
KY Cayman Islands
KZ Kazakhstan
LA Laos
LB Lebanon
LC Saint Lucia
LI Liechtenstein
LK Sri Lanka
LR Liberia
LS Lesotho
LT Lithuania
LU Luxembourg
LV Latvia
LY Libya
MA Morocco
MC Monaco
MD Moldova
ME Montenegro
MG Madagascar
MH Marshall Islands
MK North Macedonia
ML Mali
MM Myanmar
MN Mongolia
MO Macau S.A.R
MP Northern Mariana Islands
MQ France
MR Mauritania
MT Malta
MU Mauritius
MV Maldives
MW Malawi
MX Mexico
MY Malaysia
MZ Mozambique
NA Namibia
NC New Caledonia
NE Niger
NG Nigeria
NI Nicaragua
NL Netherlands
NO Norway
NP Nepal
NZ New Zealand
OM Oman
PA Panama
PE Peru
PF French Polynesia
PG Papua New Guinea
PH Philippines
PK Pakistan
PL Poland
PR Puerto Rico
PS Palestine
PT Portugal
PW Palau
PY Paraguay
QA Qatar
RE France
RO Romania
RS Serbia
RU Russia
RW Rwanda
SA Saudi Arabia
SB Solomon Islands
SC Seychelles
SD Sudan
SE Sweden
SG Singapore
SI Slovenia
SJ Svalbard and Jan Mayen Islands
SK Slovakia
SL Sierra Leone
SM San Marino
SN Senegal
SO Somalia
SR Suriname
SS South Sudan
ST Sao Tome and Principe
SV El Salvador
SY Syria
SZ eSwatini
TC Turks and Caicos Islands
TD Chad
TG Togo
TH Thailand
TJ Tajikistan
TL East Timor
TM Turkmenistan
TN Tunisia
TO Tonga
TR Turkey
TT Trinidad and Tobago
TV Tuvalu
TW Taiwan
TZ Tanzania
UA Ukraine
UG Uganda
US United States of America
UY Uruguay
UZ Uzbekistan
VA Vatican
VC Saint Vincent and the Grenadines
VE Venezuela
VI United States Virgin Islands
VN Vietnam
VU Vanuatu
WS Samoa
XK Kosovo
YE Yemen
YT France
ZA South Africa
ZM Zambia
ZW Zimbabwe
25 de Mayo|25 de mayo|veinticinco de mayo|AR|1fx|dg6|-83o0|-ei8x|ne:j647u1|1
28 de Noviembre|28 de noviembre|veintiocho de noviembre|AR|1j8|438|-b2j8|-fhvc|ne:j647ov|0
Aalborg|aalborg|alborg|DK|18s|2maz|c82p|24im|ne:j64gi1|1
Aarau|aarau||CH|1|byl|a5nw|1pzo|ne:j63ugd|1
Aba|aba||NG|3|j8k8|13cs|1kpo|ne:j64d6v|1
Abadan|abadan||IR|uz|7xms|6i17|acj1|ne:j64ku3|1
Abadla|abadla||DZ|5o|b30|6nbv|-l39|ne:j64hyb|1
Abaetetuba|abaetetuba||BR|1ck|1pa4|-db1|-ah75|ne:j64kwt|1
Abaí|abai||PY|b2|2c0|-5kug|-bzmw|ne:j64b4t|1
Abakan|abakan||RU|wc|3l2x|bidp|jlle|ne:j64lkf|1
Abancay|abancay||PE|3o|16iv|-2x8s|-fmf8|ne:j64azd|1
Abau|abau||PG|cd|6e|-25hm|vuc2|ne:j64bpv|1
Abaza|abaza||RU|uo|dym|baea|jb6i|ne:j645ln|1
Abbotsford|abbotsford||CA|9t|391f|aih4|-q7o8|ne:j64h0p|1
Abbottabad|abbottabad||PK|165|pdb3|7bhz|fot7|ne:j64573|1
Abéché|abeche||TD|1bl|3e5p|2ysg|4gq4|ne:j64mj5|1
Abengourou|abengourou||CI|15c|289g|1fxk|-qxg|ne:j64gl3|1
Abeokuta|abeokuta||NG|1ag|cpn0|1j90|puk|ne:j64d7z|1
Aberdeen|aberdeen||GB|2|4244|c94o|-g1s|ne:j64abp|1
Aberdeen|aberdeen||US|1ux|p9l|a2gl|-qjcw|ne:j648ej|1
Aberdeen|aberdeen||US|1m9|k3d|9qt7|-l3xc|ne:j648s5|1
Abha|abha||SA|1xl|4ipy|3wnx|93xl|ne:j64kbb|1
Abidjan|abidjan||CI|xx|29hn4|152b|-v6s|ne:j64mz3|1
Abilene|abilene||US|1q4|2g5j|6ydi|-ldjk|ne:j64jup|1
Aboa Station|aboa station||AQ||i|-g334|-2viv|ne:j64iw1|1
Abohar|abohar||IN|1f3|2srv|6ges|fx84|ne:j64g91|1
Aboisso|aboisso||CI|1n9|t1y|166j|-oow|ne:j63ylz|1
Abomey|abomey||BJ|1xe|1re2|1jhc|fcs|ne:j64hyx|1
Abong Mbang|abong mbang||CM|j0|bb9|uql|2tq1|ne:j64hmf|1
Abra Pampa|abra pampa||AR|rr|3gg|-4va7|-e2y0|ne:j647vt|1
Abu Dhabi|abu dhabi||AE|6|cxno|58sb|bnhu|ne:j64mat|1
Abu Kamal|abu kamal||SY|g6|1qco|7dtk|8rqa|ne:j649g5|1
Abuja|abuja||NG|jg|xs1s|1y3p|1m42|ne:j64mhb|1
Abunã|abuna||BR|1gx|1hl|-22t6|-e0bh|ne:j64goz|1
Acapulco|acapulco|acapulco de juarez|MX|mm|fc5c|3m0k|-leyg|ne:j64mg7|1
Acaraú|acarau||BR|ca|lwl|-mao|-8lkg|ne:j64gun|1
Acarigua|acarigua||VE|1ee|5lbt|21x8|-ety8|ne:j648wb|1
Acatlan|acatlan|acatlan de osorio|MX|1ez|ekf|3wfk|-l0k4|ne:j645wd|1
Accra|accra||GH|m4|19gko|16u8|-1or|ne:j64my3|1
Achacachi|achacachi||BO|xi|6in|-3g3l|-epu2|ne:j6484x|1
Achinsk|achinsk||RU|wc|2irm|c26k|jeaw|ne:j64j9t|1
Açu|acu|assu|BR|1gk|rvh|-171w|-7wst|ne:j64gxx|1
Ad Dakhla|ad dakhla|dakhla|MA|1bq|1wwc|52z9|-3eyw|ne:j64kit|1
Ad Damazīn|ad damazin||SD|8q|3zk3|2itk|7d1o|ne:j649gn|1
Ad-Damir|ad damir|eddamer|SD|1gp|2879|3rq4|7a1c|ne:j64kat|1
Ad Diwaniyah|ad diwaniyah|al diwaniyah|IQ|22|7ojs|6utt|9mmw|ne:j6470p|1
Ad Nabk|ad nabk|an nabk|SY|fz|12pu|7ah6|7vfp|ne:j649gj|1
Adana|adana|seyhan|TR|f|rpoo|7xgx|7kil|ne:j64ldx|1
Adapazarı|adapazari||TR|1hx|5kp9|8qtc|6iom|ne:j64j2f|1
Addis Ababa|addis ababa||ET|g|1ufz4|1xpt|8alh|ne:j64n25|1
Adelaide|adelaide||AU|1m5|ojhk|-7hjm|tpfh|ne:j64mrh|1
Adelaide River|adelaide river||AU|19i|6l|-2u8f|s3ko|ne:j64i6t|1
Aden|aden||YE|1xk|lfls|2qlx|9nan|ne:j64mbn|1
Adigrat|adigrat||ET|1qi|289h|326s|8gjw|ne:j64fxd|1
Adıyaman|adiyaman||TR|h|4sn4|83fs|87db|ne:j64af5|1
Adjumani|adjumani||UG|i|qrw|pxq|6tg1|ne:j63tz3|1
Ado Ekiti|ado ekiti||NG|ib|9kpp|1mvk|14a0|ne:j64d8p|1
Adrar|adrar||DZ|j|17wu|5z1o|-28k|ne:j64l3v|1
Afyon|afyon|afyonkarahisar|TR|l|3d4w|8b00|6jq4|ne:j64aet|1
Agadez|agadez||NE|n|2ive|3n53|1plg|ne:j64mcj|1
Agadir|agadir||MA|1m3|hoxn|6ivk|-2288|ne:j64kdd|1
Agana|agana|hagatna|GU||2mgb|2vxo|v0wc|ne:j64l55|1
Agapa|agapa||RU|1pq|a|fbbc|j4no|ne:j64cnx|1
Agartala|agartala||IN|1rn|4cu8|53wy|jkbk|ne:j64ggj|0
Agboville|agboville||CI|o|1r3e|19u3|-x0w|ne:j64gkh|1
Agdam|agdam||AZ|1r8|0|8rml|9rik|ne:j63z33|1
Agen|agen||FR|3t|18xb|9h1w|4vx|ne:j64fnn|1
Aginskoye|aginskoye||RU|m|8v7|aybb|ojnw|ne:j64con|1
Agordat|agordat||ER|kj|m2g|3bz6|84c3|ne:j64ejx|1
Agra|agra||IN|1sy|y4e8|5tnw|gpyb|ne:j64l87|1
Ağrı|agri||TR|p|1vse|8iha|986p|ne:j64agn|1
Agrinio|agrinio||GR|hs|1m1t|8a0a|4l6l|ne:j64fu7|1
Agua Prieta|agua prieta||MX|1lw|1uf7|6pon|-nhe6|ne:j64cvl|1
Aguascalientes|aguascalientes|aguascalientes city|MX|q|imiw|4ou6|-lxak|ne:j64je7|1
Aguelhok|aguelhok||ML|v3|6y0|4645|6lw|ne:j64ct5|1
Ahar|ahar||IR|hv|27yv|88xp|a351|ne:j64715|1
Ahmedabad|ahmedabad|ahmadabad|IN|fq|377dk|4xps|fk0l|ne:j64myx|1
Ahmednagar|ahmednagar||IN|11a|8ea8|43gg|g0rw|ne:j64jpf|1
Ahuachapán|ahuachapan||SV|t|qba|2zee|-j98y|ne:j63wvf|1
Ahvaz|ahvaz|ahwaz|IR|uz|lcio|6pdf|afwt|ne:j64lyl|1
Aiguá|aigua||UY|11j|22s|-7bw0|-bqgc|ne:j6413f|1
Aiken|aiken||US|1m7|zn8|76vb|-hik6|ne:j64913|1
Aiquile|aiquile||BO|ed|6cg|-3wcn|-dyxk|ne:j64hbl|1
Aix-en-Provence|aix en provence||FR|1ew|35ad|9bsw|161w|ne:j646tj|1
Aizawl|aizawl||IN|14e|62dp|52y8|jvfk|ne:j64ggf|1
Ajaccio|ajaccio||FR|f5|15y4|8zif|1vcj|ne:j64fnt|1
Ajdabiya|ajdabiya||LY|y|32zd|6lf8|4c0o|ne:j64ksf|1
Ajmer|ajmer||IN|1fz|cn8h|5o38|fzxc|ne:j6471z|1
Aketi|aketi||CD|1b8|197t|l59|53hk|ne:j64ej1|1
Akhtubinsk|akhtubinsk||RU|4q|ydj|acir|9w8n|ne:j64kfj|1
Akita|akita||JP|10|6uyt|8iek|u0xw|ne:j64joh|1
Akjoujt|akjoujt||MR|q3|aa|48da|-331i|ne:j640nf|1
Akola|akola||IN|11a|asi6|4fss|gi7o|ne:j64lvv|1
Akron|akron||US|1aj|f2lc|8swg|-hh0g|ne:j6493l|1
Aksu|aksu||CN|1vs|ew9k|8tik|h77o|ne:j64jj1|1
Aksum|aksum|axum|ET|1qi|10n3|3114|8ark|ne:j64fxh|1
Akure|akure||NG|1au|90j6|1jy0|144g|ne:j64d87|1
Akureyri|akureyri|akureyi|IS|12|cs3|e2oq|-3vns|ne:j64k2h|1
Al Ahmadi|al ahmadi||KW|14|1h23|68cx|ab0m|ne:j6458l|1
Al Amarah|al amarah|thi qar|IQ|13b|7e7j|6tow|a3tk|ne:j64g6x|1
Al Aqabah|al aqabah|aqaba|JO|3p|21c8|6bty|7int|ne:j64dt7|1
Al Ayn|al ayn|al ain|AE|6|8rdp|56yp|by3c|ne:j649ql|1
Al Bayda|al bayda||YE|17|t6l|2zv2|9rng|ne:j640ah|1
Al Bayda|al bayda||LY|1i|1du|70s4|4mtk|ne:j64ddp|1
Al Fallujah|al fallujah|fallujah|IQ|1z|4yvf|75b9|9dsd|ne:j64gld|1
Al Fujayrah|al fujayrah|fujairad,fujairah|AE|jx|20nn|5duq|c2pb|ne:j649qh|1
Al Ghaydah|al ghaydah||YE|1q|l58|3hay|b6hy|ne:j649pv|1
Al Hasakah|al hasakah||SY|ns|2quc|7ti9|8qfg|ne:j643ij|1
Al Hillah|al hillah|hillah|IQ|5p|cqst|6yk1|9ird|ne:j64glh|1
Al Hillah|al hillah||SA|3v|cqst|518v|a0rw|ne:j6453n|1
Al Hudaydah|al hudaydah||YE|1e|gpuo|3673|97eu|ne:j64jxf|1
Al Jaghbub|al jaghbub|jaghbub|LY|19|1cg|6dk0|5966|ne:j64deh|1
Al Jahra|al jahra|al jahrah|KW|1j|45u9|6adb|a7qd|ne:j6458t|1
Al Jawf|al jawf||LY|1n|imc|56q8|4zpg|ne:j64lx7|1
Al Jubayl|al jubayl|jubail governorate|SA|4k|532y|5sda|an2k|ne:j64bd7|1
Al Karak|al karak||JO|t8|1pry|6omj|7nhz|ne:j64dtd|1
Al Khalil|al khalil|hebron|PS||60ap|6rda|7iss|ne:j6488t|1
Al Kharj|al kharj|al kharj governorate|SA|3v|6e9o|56dw|a528|ne:j64bcx|1
Al Khums|al khums|khoms|LY|1r|4btj|700c|3214|ne:j64dcl|1
Al Kut|al kut|kut|IQ|1uy|6w35|6yp7|9tmo|ne:j64g71|1
Al Mafraq|al mafraq|mafraq|JO|110|182m|6x3l|7rkt|ne:j63wmz|1
Al Marj|al marj|campament of al marj|LY|1d|3mtg|6yrx|4gq4|ne:j64ddl|1
Al Mubarraz|al mubarraz||SA|4k|6ede|5g7n|amgb|ne:j6453v|1
Al Mukalla|al mukalla|mukalla|YE|n9|5j6c|3478|aj23|ne:j64jyj|1
Al Musayyib|al musayyib|musayyib|IQ|5p|1mzq|70x6|9hqs|ne:j6473n|1
Al Qamishli|al qamishli|qamishli|SY|ns|28bv|7xq4|8u4s|ne:j643i5|1
Al-Qatif|al qatif|qatif governorate|SA|4k|7wn0|5omk|apw3|ne:j6453z|1
Al Qunaytirah|al qunaytirah|quneitra|SY|lf|3by|73ll|7of0|ne:j64akv|0
Al Qunfudhah|al qunfudhah|al qunfudhah governorate|SA|11f|4d|43kw|8syt|ne:j64j3z|1
Al Quwayiyah|al quwayiyah|al quway iyah governorate|SA|3v|6q0|55r5|9pdy|ne:j6453h|1
Al-Ubayyid|al ubayyid|el obeid|SD|194|8fhb|2tq1|6h5j|ne:j64lfz|1
Al Wajh|al wajh|al wajh governorate|SA|1oh|xd1|5mes|7tcs|ne:j64kaf|1
Alagoinhas|alagoinhas||BR|60|2nqe|-2lo8|-88j0|ne:j64k0x|1
Alajuela|alajuela||CR|25|8b6n|25bc|-i1x8|ne:j646c1|1
Alamogordo|alamogordo||US|17p|rtm|71ur|-mpl9|ne:j64ixv|1
Alapayevsk|alapayevsk||RU|1nz|xy8|cech|d80j|ne:j645ip|1
Alappuzha|alappuzha||IN|uh|3sen|21b0|gd9w|ne:j64fj7|1
Alatyr|alatyr||RU|e2|ztn|br88|9zkg|ne:j64cbv|1
Alausí|alausi||EC|df|b12|-gwc|-gwes|ne:j646b3|1
Alayat Samail|alayat samail|alayat sama il|OM|a|10ti|4zt4|cfd2|ne:j645m5|1
Alba Lulia|alba lulia|alba iulia|RO|27|1ezp|9vj6|51y0|ne:j63uof|1
Albacete|albacete||ES|c4|3dzi|8cxf|-efg|ne:j649cv|1
Albany|albany||US|17s|inuk|958s|-ftlj|ne:j64jwn|1
Albany|albany||US|ks|1whq|6rnv|-i1cm|ne:j648z5|1
Albany|albany||US|1b3|13n4|9kal|-qdqt|ne:j648lx|1
Albany|albany||AU|1ve|kel|-7i6x|p9no|ne:j64m5h|1
Albert Lea|albert lea||US|142|fu2|9cse|-k0fr|ne:j64151|1
Albuquerque|albuquerque||US|17p|j9ea|7ive|-muul|ne:j64l9x|1
Albury|albury||AU|17q|28g2|-7q8o|vhn4|ne:j64k53|1
Aldama|aldama|maclovio herrera|MX|1oz|9hg|4wus|-l0po|ne:j64cxl|1
Aldan|aldan||RU|1hy|iui|ck6m|qvie|ne:j64ll7|1
Aleg|aleg||MR|9k|6h0|3nmc|-2zbm|ne:j640mz|1
Aleksandrovsk Sakhalinskiy|aleksandrovsk sakhalinskiy|alexandrovsk sakhalinsky|RU|1hz|9a0|awq7|ugvt|ne:j64jdn|1
Alekseyevka|alekseyevka|alexeyevka|RU|7q|uqw|auuf|8ak3|ne:j64c45|1
Aleksin|aleksin||RU|1rt|1flx|bomv|7y80|ne:j645f1|1
Alenquer|alenquer||BR|1ck|kaa|-eys|-bqrg|ne:j64gnp|1
Aleppo|aleppo|halab|SY|2a|1monk|7rkf|7ysh|ne:j64mub|1
Alert|alert||CA|19z|3h|hog1|-dcbo|ne:j64kzx|1
Ålesund|alesund||NO|10m|10v0|delq|1dag|ne:j64bb7|1
Alexander Bay|alexander bay||ZA|19f|15o|-64qr|3jc9|ne:j64kbt|1
Alexandria|alexandria|al iskandariyah|EG|1g|2h9qg|6or8|6f2x|ne:j64mwl|1
Alexandria|alexandria||US|1u5|2q7d|8bjg|-giwo|ne:j6494f|1
Alexandria|alexandria||US|zy|1n2t|6plj|-jtb6|ne:j64jun|1
Alexandria|alexandria||RO|1py|122q|9eqw|5f43|ne:j63ubh|1
Alexandroupoli|alexandroupoli||GR|2z|14vn|8r6u|5jnc|ne:j646z3|1
Aleysk|aleysk||RU|2h|lmb|b912|hqpt|ne:j64cfz|1
Algeciras|algeciras||ES|31|2do3|7qr7|-166h|ne:j643f3|1
Algha|algha|alga|KZ|3r|lt7|ap20|caee|ne:j64g05|1
Algiers|algiers|el djazacr|DZ|2b|1zvyo|7voi|niu|ne:j64mzz|1
Ali Sabih|ali sabih|ali sabieh|DJ|2c|ux6|2e2y|95kl|ne:j64ek7|1
Alicante|alicante||ES|ep|6rpz|87x4|-3qc|ne:j64auv|1
Alice|alice||US|1q4|hhb|5y4h|-l0pt|ne:j6420d|1
Alice Springs|alice springs||AU|19i|ldq|-52vm|sp0w|ne:j64mrb|1
Aligarh|aligarh||IN|1sy|h954|5z8e|gqba|ne:j64l8b|1
Alipur Duar|alipur duar|alipurduar|IN|1v3|2q9a|5ocl|j73n|ne:j64gcf|1
Aliwal North|aliwal north||ZA|i3|yac|-6ksw|5q3g|ne:j64but|1
Allahabad|allahabad||IN|1sy|pqp4|5gfd|hjgt|ne:j64l81|1
Allakaket|allakaket||US|26|2p|e9mf|-wptj|ne:j643uf|1
Allanmyo|allanmyo|myede|MM|115|18o9|45iv|kes7|ne:j64ir7|1
Allende|allende||MX|eb|f5g|62lg|-lm5w|ne:j645rb|1
Allentown|allentown||US|1cy|an22|8p9s|-g6k8|ne:j6436j|1
Alliance|alliance||US|17a|6fs|90uu|-m1r2|ne:j641tb|1
Almaty|almaty||KZ|2e|pwvc|9ab9|ghgr|ne:j64mm1|1
Almenara|almenara||BR|141|mmt|-3gro|-8q1k|ne:j6478d|1
Almería|almeria||ES|31|3ufh|7w6n|-ir0|ne:j649cd|1
Almetyevsk|almetyevsk||RU|1pn|30d1|brm4|b7pb|ne:j64cdl|1
Almirante|almirante||PA|8s|69e|1zrc|-hnsw|ne:j64591|1
Alofi|alofi||NZ|18d|g5|-4344|-10f28|ne:j64n7h|0
Alor Setar|alor setar||MY|u9|77mj|1b65|lihd|ne:j64bgn|1
Alotau|alotau||PG|140|8yw|-27hp|w8y7|ne:j64bq1|1
Alpena|alpena||US|13u|e56|9np4|-hvrr|ne:j643cx|1
Alpine|alpine||US|1q4|52z|6i9j|-m7vu|ne:j6421z|1
Alta|alta||NO|jm|9bh|ezv6|4zc1|ne:j64j4j|1
Alta Floresta|alta floresta||BR|136|v82|-24e0|-bzek|ne:j64m0p|1
Alta Gracia|alta gracia||AR|fp|v5s|-6sag|-dt58|ne:j647ux|1
Altagracia de Orituco|altagracia de orituco||VE|ms|uwk|2408|-e86w|ne:j6499v|1
Altai|altai|altay|MN|lq|p2g|9xzt|kjjm|ne:j64jfd|1
Altamira|altamira||BR|1ck|1ip4|-oos|-b6us|ne:j64god|1
Altata|altata||MX|1l5|rs|5a3c|-n4oq|ne:j645sj|1
Altay|altay|altay city|CN|1vs|31kg|a9ca|ivwu|ne:j64lrt|1
Altdorf|altdorf||CH|1sp|6p2|a1py|1ung|ne:j63ulf|1
Alto Rio Sanguer|alto rio sanguer|alto rio senguer|AR|dx|170|-9nh9|-f6jx|ne:j647pd|1
Alton|alton||US|pu|1t10|8c32|-jbv6|ne:j6491l|1
Altoona|altoona||US|1cy|1onj|8on6|-gswe|ne:j64357|1
Alvorada|alvorada||BR|1qs|7w8|-2o7w|-aipw|ne:j64m0d|1
Alwar|alwar||IN|1fz|62jg|5wji|gf35|ne:j64ga1|1
Alxa Zuoqi|alxa zuoqi|alxa left banner|CN|17d|17ib|8bom|mnce|ne:j64f05|1
Am Timan|am timan||TD|1i3|nhn|2d4t|4ci9|ne:j64knh|1
Amahai|amahai|kota masohi|ID|11k|10rp|-poh|rmwt|ne:j64dnb|1
Amapá|amapa||BR|2n|1i3|ftg|-avz4|ne:j64l0h|1
Amaravati|amaravati||IN|33|3gbb4|3jkp|h9bv|ne:sm0fv1|1
Amarillo|amarillo||US|1q4|3w92|7ju4|-ltq4|ne:j64lan|1
Amasya|amasya||TR|2p|1ryo|8pop|7ohm|ne:j64afx|1
Ambala|ambala||IN|nr|359f|6hy8|ggqw|ne:j646s5|1
Ambanja|ambanja||MG|3e|nml|-2xkt|aduc|ne:j64bo3|1
Ambarchik|ambarchik||RU|1hy|0|exfi|ysko|ne:j64lkx|1
Ambato|ambato||EC|16w|615d|-9so|-gumw|ne:j64e4f|1
Ambatondrazaka|ambatondrazaka||MG|1qr|xa6|-3tll|adl3|ne:j64bov|1
Ambler|ambler||US|26|76|edn5|-xtzm|ne:j649k1|1
Ambon|ambon||ID|11k|7mdo|-sof|rh74|ne:j64lo1|1
Ambriz|ambriz||AO|7v|d48|-1oly|2t9u|ne:j64l35|1
Amderma|amderma||RU|17f|7u|eyam|d7tx|ne:j64kf3|1
Americana|americana||BR|1o6|a9yo|-4vjf|-a578|ne:j64801|1
Ames|ames||US|qb|1828|90hn|-k2dh|ne:j648ot|1
Amherst|amherst||CA|19o|77c|9tiu|-drhy|ne:j647np|1
Amiens|amiens||FR|1dp|32em|ap18|hqw|ne:j64fqd|1
Amman|amman||JO|2s|mpwg|6ujk|7p8y|ne:j64mhj|1
Amol|amol||IR|13c|4r0y|7tex|b81d|ne:j64g5n|1
Amos|amos||CA|1fv|844|aeqq|-gqr3|ne:j647mp|1
Amravati|amravati||IN|11a|fqpf|4hng|go2s|ne:j64jpj|1
Amritsar|amritsar||IN|1f3|pz6o|6s5f|g1oo|ne:j64mm7|1
Amsterdam|amsterdam||NL|18l|m3iw|b7y7|11x7|ne:j64n1b|1
Amundsen–Scott South Pole Station|amundsen scott south pole station|amundseniscott south pole station|AQ||5k|-jag0|11xp5|ne:j64ivf|1
Amursk|amursk||RU|un|109d|aris|tcb2|ne:j64cr7|1
An Nabk|an nabk|nabk|SA|1k|7ps|6prp|802d|ne:j63vjt|1
An Nasiriyah|an nasiriyah|nasiriya|IQ|gk|9oez|6nj1|9x04|ne:j64g6t|1
Anaco|anaco||VE|3i|2iqk|20u8|-dtdk|ne:j6437b|1
Anadyr|anadyr||RU|dy|7z0|dvii|121em|ne:j64me7|1
Anápolis|anapolis||BR|le|6ulf|-3hx8|-ahs0|ne:j64hcv|1
Añatuya|anatuya||AR|1jg|awl|-63n9|-dgtp|ne:j64hhf|1
Anbyon|anbyon||KP|sz|tfi|8d56|rbxu|ne:j6464z|1
Anchorage|anchorage||US|26|5ku3|d4dk|-w4my|ne:j64mtt|1
Ancona|ancona||IT|12c|25jv|9cf8|2w5z|ne:j64dsz|1
Ancud|ancud||CL|zq|lmc|-8z2k|-ftoc|ne:j64krf|1
Anda|anda||CN|o5|3w2l|9y0w|quz4|ne:j646nz|1
Andamooka|andamooka||AU|1m5|eo|-6it2|tedk|ne:j64ifx|1
Anderson|anderson||US|1m7|1bhy|7e8d|-hpqf|ne:j6490z|1
Andijan|andijan|andijon,andizhan|UZ|34|dxjk|8qqk|fi6g|ne:j64lcz|1
Andkhvoy|andkhvoy|andkhoy|AF|je|1jci|7wyt|dybr|ne:j64hpd|1
Andoany|andoany||MG|3e|hi0|-2ve8|acfe|ne:j64klb|1
Andoas|andoas||PE|zn|a|-me5|-gdix|ne:j64b1p|1
Andong|andong||KR|fr|2rs7|7u57|rl8y|ne:j64aij|1
Andorra|andorra|andorra la vella|AD||15ny|93xk|bp9|ne:j64l5t|1
Andradina|andradina||BR|1o6|14fq|-4hc8|-b0g7|ne:j64hk3|1
Androka|androka||MG|1qz|4u|-5d2j|9g31|ne:j64klt|1
Ang Thong|ang thong||TH|35|alm|34ix|lj2s|ne:j63uzz|1
Angangxi|angangxi|ang angxi|CN|o5|irh|a3w1|qj8w|ne:j646ob|1
Angarsk|angarsk||RU|qg|57me|b9k0|m9uo|ne:j64lkd|1
Angeles|angeles||PH|1c7|6qnx|38uz|pu4r|ne:j64kgn|1
Angers|angers||FR|1cr|41cs|a6cw|-438|ne:j646tb|1
Angoche|angoche||MZ|16p|18mj|-3h8c|8jy4|ne:j64kcb|1
Angol|angol||CL|xd|ym0|-83l8|-fl18|ne:j646wf|1
Angra do Heroísmo|angra do heroismo||PT|5g|9al|8a88|-5u07|ne:j64b5n|1
Angren|angren||UZ|1pk|4bx2|8slc|f1bh|ne:j649sn|1
Aniak|aniak||US|26|dx|d757|-y6vq|ne:j649j7|1
Ankang|ankang||CN|1k8|nkrk|705s|nd7c|ne:j64ls1|1
Ankara|ankara||TR|37|27na8|8k3g|71kg|ne:j64mtz|1
Anlu|anlu||CN|p6|1ixq|6pa4|od30|ne:j646jt|1
Ann Arbor|ann arbor||US|13u|5p88|92e4|-hxzk|ne:j649av|1
Anna Regina|anna regina||GY|fn|2eh|1k3k|-cje1|ne:j64a7n|1
Annaba|annaba||DZ|38|asis|7wvk|1nvk|ne:j64m4l|1
Annapolis|annapolis||US|12o|1qqc|8crb|-ge7x|ne:j6432n|1
Annecy|annecy||FR|1gg|29lh|9u60|1b73|ne:j646a3|1
Anqing|anqing||CN|36|cfwx|6jc8|p35w|ne:j64jgz|1
Ansan|ansan||KR|mv|fulh|806h|r6ur|ne:j644jl|1
Anshan|anshan|anshan liaoning|CN|ys|z4ns|8t9e|qclh|ne:j64lsn|1
Anshun|anshun||CN|mp|i73c|5mkb|mpch|ne:j64jgj|1
Antakya|antakya|antioch|TR|nu|3bg3|7rkt|7qof|ne:j63tp7|1
Antalaha|antalaha||MG|3e|10fs|-36u9|arzl|ne:j64kl7|1
Antalya|antalya||TR|3a|gs60|7wnr|6kv8|ne:j64k3p|1
Antananarivo|antananarivo||MG|3b|10dew|-41y3|a6mj|ne:j64mib|1
Antigonish|antigonish||CA|19o|577|9s25|-dadq|ne:j64h6v|1
Antigua Guatemala|antigua guatemala||GT|1hi|udk|34eb|-jg3p|ne:j63xjp|1
Antofagasta|antofagasta||CL|3d|6n2g|-52hg|-f37k|ne:j64mkx|1
Antsirabe|antsirabe||MG|3b|6lld|-495w|a2wt|ne:j64kl5|1
Antsiranana|antsiranana||MG|3e|1rzt|-2mq5|akhn|ne:j64lpp|1
Antsohihy|antsohihy||MG|118|gfe|-36ph|aa8q|ne:j64bop|1
Antwerpen|antwerpen|antwerp|BE|3f|jpvk|az8f|y1v|ne:j64k3d|1
Anuradhapura|anuradhapura||LK|3g|2ja6|1sfg|h88p|ne:j64kgb|1
Anxi|anxi||CN|kg|dsu|8oi4|kj74|ne:j64dut|1
Anyang|anyang||CN|o6|j0ew|7qer|oibd|ne:j64jl3|1
Anzhero Sudzhensk|anzhero sudzhensk||RU|uc|1sks|c0ps|ifw0|ne:j645l5|1
Aomori|aomori||JP|3j|6e8q|8r0a|u5q4|ne:j64joj|1
Aosta|aosta||IT|1t6|qa6|9swq|1kfy|ne:j63woh|1
Apalachicola|apalachicola||US|jp|1rg|6dd4|-i7t1|ne:j648yt|1
Apatity|apatity||RU|15q|1fmj|eheb|75nu|ne:j645ap|1
Apatzingán|apatzingan||MX|13v|23xy|4380|-lxqk|ne:j645vh|1
Apia|apia||WS||1brw|-2ysv|-10t56|ne:j64msd|1
Apodi|apodi||BR|1gk|cxh|-17lg|-83o0|ne:j647gf|1
Apolo|apolo||BO|xi|38d|-35ks|-enxk|ne:j64huz|1
Appenzell|appenzell||CH|3l|4cx|a585|20nr|ne:j63wf7|1
Appleton|appleton||US|1vm|4d5d|9hkv|-iy3p|ne:j6430f|1
Apsheronsk|apsheronsk||RU|wb|zec|9j4f|8ijr|ne:j645g5|1
Apucarana|apucarana||BR|1ch|2aml|-51po|-b158|ne:j647bh|1
Aqadyr|aqadyr||KZ|1fc|7hq|achp|fm6v|ne:j64633|1
Aqsay|aqsay|aksay|KZ|1v7|qun|ayua|bd7x|ne:j64g1j|1
Aqsu|aqsu|aksu|KZ|3q|6lb|b8pi|ff8t|ne:j64g25|1
Aqtau|aqtau|aktau|KZ|11u|3gf|9clk|azcd|ne:j64kuf|1
Aqtobe|aqtobe|aktobe,aktyubinsk|KZ|3s|5mih|aryo|c94k|ne:j64ly1|1
Aquidauana|aquidauana||BR|137|vhf|-4dy0|-byh8|ne:j64gpd|1
Ar Ramadi|ar ramadi|ramadi|IQ|1z|6bpt|75vc|9a3s|ne:j6473j|1
Ar Raqqah|ar raqqah|raqqa|SY|3u|3t2c|7p8o|8d2w|ne:j649ft|1
Ar Rutbah|ar rutbah|ar rutba|IQ|1z|h9e|72xd|8mu5|ne:j64gl7|1
Aracaju|aracaju||BR|1k5|eoto|-2c3s|-7yf4|ne:j64kyj|1
Aracati|aracati||BR|ca|y6d|-z6o|-83fo|ne:j64kxn|1
Araçatuba|aracatuba||BR|1o6|3n6w|-4jno|-at9w|ne:j64k3b|1
Araçuaí|aracuai||BR|141|gz9|-3m38|-90m3|ne:j64gr1|1
Arad|arad||RO|3w|3mg9|9w90|4ki8|ne:j644qj|1
Araguaína|araguaina||BR|1qs|12x8|-1jh8|-abzo|ne:j64kwx|1
Araguari|araguari||BR|141|22id|-3zts|-abww|ne:j64787|1
Arak|arak||IR|12i|asm7|7ays|anhk|ne:j64g7b|1
Arak|arak||DZ|1oy|92kz|5f28|sxo|ne:j64l45|1
Aral|aral||KZ|1fw|ph5|a140|d7tm|ne:j64ktv|1
Aranyaprathet|aranyaprathet||TH|1hd|hc8|2xko|lyvd|ne:j649x1|1
Araouane|araouane||ML|1qj|33u|41u0|-r8j|ne:j64kql|1
Arapiraca|arapiraca||BR|24|40t0|-238c|-7uy4|ne:j64kxx|1
Arapongas|arapongas||BR|1ch|238o|-50ms|-b0u4|ne:j647av|1
Arar|arar|ar ar|SA|1f|4rb4|6n4c|8sin|ne:j64b8d|1
Araranguá|ararangua||BR|1j7|xis|-67aw|-aly0|ne:j647cj|1
Ararat|ararat||AU|1tx|4pq|-7znf|ump8|ne:j64ihb|1
Arauca|arauca||CO|41|1hg0|1ipn|-f600|ne:j64eaz|0
Arawa|arawa||PG|197|v2i|-1c20|xccs|ne:j63vyj|1
Araxá|araxa||BR|141|1rqb|-472s|-a29o|ne:j64gq1|1
Arba Minch|arba minch||ET|1mp|1hpy|1als|81qk|ne:j64kt3|1
Arcata|arcata||US|bd|g4p|8rh0|-qlgy|ne:j648fx|1
Archangel|archangel|arkhangelsk|RU|4a|7mqb|du9i|8oui|ne:j64med|1
Arcoverde|arcoverde||BR|1d4|183v|-1syw|-7y18|ne:j6482t|1
Arctic Bay|arctic bay||CA|19z|gs|fnj1|-i95e|ne:j64mo1|1
Ardabil|ardabil||IR|43|8vwr|8750|acoo|ne:j64ku5|1
Ardmore|ardmore||US|1ao|j9c|7bqr|-ktge|ne:j641uj|1
Arecibo|arecibo||PR||1hh7|3ya8|-eaw4|ne:j64l57|1
Arendal|arendal||NO|57|nus|cj48|1vn0|ne:j63vnz|1
Arequipa|arequipa||PE|44|hguw|-3iok|-fby0|ne:j64lex|1
Arezzo|arezzo||IT|1r5|1yo5|9bcp|2jmm|ne:j64dr3|1
Argentia|argentia||CA|17t|tj|a4z0|-bkl8|ne:j64h7d|1
Århus|arhus|aarhus|DK|13y|53an|c1b8|26sb|ne:j64kuz|1
Arica|arica||CL|47|3zin|-3yqw|-f2d0|ne:j64lwf|1
Aripuanã|aripuana||BR|136|ktj|-26iv|-cqo7|ne:j64kxb|1
Ariquemes|ariquemes||BR|1gy|18ts|-24p0|-diq8|ne:j64gov|1
Arjona|arjona||CO|90|12w5|2760|-g5ek|ne:j646e7|1
Arlington|arlington||US|1q4|fj8p|7074|-ksm2|ne:j6425l|1
Arlit|arlit||NE|n|255s|417s|1kk4|ne:j64ka7|1
Arlon|arlon||BE|4b|k77|ancx|18vr|ne:j63zkv|0
Armavir|armavir||RU|wb|49z0|9n84|8td0|ne:j64c4t|1
Armenia|armenia||CO|1fs|6rb4|yzj|-g7yj|ne:j64e8h|1
Armidale|armidale||AU|17q|hht|-6jfn|wi9v|ne:j64m5x|1
Arnhem|arnhem||NL|kq|31be|b554|19pa|ne:j63vl5|1
Arqalyq|arqalyq|arkalyk|KZ|1fh|16u9|aro2|ec6o|ne:j64jrn|1
Arras|arras||FR|18q|1did|arzl|lh5|ne:j646u5|1
Arrecife|arrecife||ES||14uo|67iy|-2wgi|ne:j64it5|1
Arroyos y Esteros|arroyos y esteros||PY|ez|2cv|-5dac|-c8ic|ne:j644wx|1
Arsenyev|arsenyev||RU|1eq|19ak|9grb|skev|ne:j645ol|1
Artashat|artashat||AM|40|fv6|8kab|9jr6|ne:j63z0d|1
Artemisa|artemisa||CU|xf|1gix|4w12|-hqlf|ne:j64ebz|1
Artemovsk|artemovsk|artyomovsk|RU|wc|3tg|bncv|k0yb|ne:j64cn5|1
Artemovskiy|artemovskiy|artyomovsky|RU|1nz|yhd|cams|d9e2|ne:j64ca5|1
Artigas|artigas||UY|4c|wc5|-6iow|-c3uk|ne:j640xv|0
Artigas Base|artigas base||AQ||1o|-dbqj|-cm73|ne:j6489n|1
Artvin|artvin|coruh|TR|4d|owg|8trq|8yo4|ne:j63tqx|1
Arua|arua||UG|4e|5cwg|nb0|6mfc|ne:j64al5|1
Arusha|arusha||TZ|4g|7b80|-pxc|7uy4|ne:j64lnp|1
Arvaikheer|arvaikheer|arvayheer|MN|1y2|ln9|9wv8|m0ya|ne:j64jft|1
Arviat|arviat||CA|19z|1fw|d3im|-k5re|ne:j64m21|1
Arxan|arxan||CN|17d|opj|a42h|ppo2|ne:j64jnj|1
Arys|arys||KZ|1md|wwo|93g1|eqwg|ne:j64ga5|1
Arzamas|arzamas||RU|18e|3211|bvgw|9dyo|ne:j645cb|1
As Salt|as salt|salt|JO|6b|30k1|6v7s|7no8|ne:j6468b|1
As Samawah|as samawah|samawah|IQ|21|3r0i|6pl7|9pdv|ne:j64g6n|1
As Sidr|as sidr|sidra|LY|1nu|1e|6knk|3wy2|ne:j64ded|1
As Sulaymaniyah|as sulaymaniyah|sulaymaniyah|IQ|4j|fi02|7me5|9qjp|ne:j64g8b|1
As Sulayyil|as sulayyil|as sulayyil governorate|SA|3v|ild|4dvz|9rmy|ne:j64kbn|1
As Suwayda|as suwayda|al suwayda|SY|4h|1jqw|70bg|7u5e|ne:j649gf|1
Asadabad|asadabad||AF|wl|11cg|7h10|f8zw|ne:j63z8f|1
Asahikawa|asahikawa||JP|oo|7n5w|9dm6|uim0|ne:j64job|1
Asansol|asansol||IN|1v3|sgow|52r9|in5i|ne:j64mmd|1
Asbest|asbest||RU|1nz|1qow|c7zq|d67o|ne:j645ij|1
Ascension|ascension||BO|1j8|b4t|-3d50|-diq8|ne:j64hwt|1
Ascensión|ascension||MX|dd|939|6nyw|-n56g|ne:j645rv|1
Asela|asela|asella|ET|g|1rgg|1pcg|8e07|ne:j64fyd|1
Ash Shatrah|ash shatrah||IQ|gk|3gyl|6qf3|9wb0|ne:j6470t|1
Ash Shihr|ash shihr||YE|n9|15vm|35vt|amsc|ne:j6441z|1
Asha|asha||RU|d2|u03|bsd8|c9x2|ne:j64c7t|1
Ashburton|ashburton||NZ|bp|dno|-9epz|10t7y|ne:j64n4v|1
Asheville|asheville||US|18z|325f|7mp8|-hozp|ne:j6493f|1
Ashgabat|ashgabat||TM|s|flhw|84to|cihl|ne:j64mav|1
Ashtarak|ashtarak||AM|3x|ehn|8myx|9ia0|ne:j63yy1|1
Asino|asino||RU|1r3|kvy|c7rf|igu3|ne:j64bvf|1
Asmara|asmara||ER|39|db0i|3ab9|8cet|ne:j64mjd|1
Asosa|asosa||ET|7y|njk|25oe|7egl|ne:j64fyv|1
Assab|assab||ER|g8|29eg|2sdw|95pg|ne:j64lrf|1
Assen|assen||NL|hf|1c0t|bcy8|1ejg|ne:j63vkj|1
Assis|assis||BR|1o6|1vhr|-4uuc|-at1k|ne:j64hjn|1
Asti|asti||IT|1dr|1izw|9mok|1rck|ne:j6468j|1
Astoria|astoria||US|1b3|7q3|9we4|-qjh8|ne:j648m3|1
Astrakhan|astrakhan||RU|4q|arr9|9xmn|aasm|ne:j64lj5|1
Asunción|asuncion||PY|4r|142wg|-5f69|-ccs3|ne:j64mcd|1
Aswan|aswan||EG|4t|6puq|55uz|71ul|ne:j64lr7|1
Asyut|asyut||EG|4u|90ix|5tss|6ol3|ne:j64lrb|1
At Bashy|at bashy|at bashi|KG|170|c1d|8tot|g8uo|ne:j64bev|1
At Tafilah|at tafilah|tafilah|JO|1on|jmd|6lwt|7mow|ne:j63wnd|1
At Taif|at taif|ta if|SA|11f|e35u|4k26|8nlb|ne:j6451d|1
Atafu|atafu||NZ|1qv|ek|-1tym|-10z01|ne:j64n7f|1
Atakpamé|atakpame||TG|1dx|1q97|1m3o|8n4|ne:j64lc1|1
Atamyrat|atamyrat|kerki|TM|cy|pne|83uw|dz31|ne:j649rp|1
'Ataq|ataq||YE|1kb|ssj|349o|a140|ne:j640at|1
Atar|atar||MR|j|y5l|4eb2|-2sp0|ne:j64mlf|1
Atasu|atasu||KZ|1fc|f4w|afp3|fcur|ne:j64g2t|1
Atbarah|atbarah|atbara|SD|1gp|3m3o|3sng|7a6w|ne:j64kav|1
Atbasar|atbasar||KZ|3q|rmz|b3uz|endh|ne:j64jrx|1
Athabasca|athabasca||CA|29|1yj|bq76|-o9yy|ne:j64gzt|1
Athens|athens|athinai|GR|54|1xhjk|853h|5342|ne:j64n21|1
Athens|athens||US|ks|2d3x|7a1p|-hvck|ne:j648zb|1
Atherton|atherton||AU|1fn|5db|-3p9b|v6g6|ne:j64in1|1
Ati|ati||TD|7b|jkt|2tzf|3xgl|ne:j64eef|1
Atikokan|atikokan||CA|1av|2sp|ag5s|-jmx2|ne:j64h51|1
Atka|atka||US|26|1p|b6r1|-11c51|ne:j649hz|1
Atkarsk|atkarsk||RU|1jk|l9e|b4a5|9n6x|ne:j64cdd|1
Atlanta|atlanta||US|ks|2okuo|791s|-i38z|ne:j64n0h|1
Atlantic City|atlantic city||US|17o|1n31|8fqm|-fy95|ne:j6496v|1
Atlixco|atlixco||MX|1ez|23hu|41u0|-l3n8|ne:j645w5|1
Atoyac|atoyac|atoyac de alvarez|MX|mm|ftv|3ops|-lix8|ne:j645y5|1
Atqasuk|atqasuk||US|26|5l|f3qu|-xqh2|ne:j643lj|1
Attapu|attapu|attapeu|LA|53|3bd|369c|mwdi|ne:j63y9v|1
Attawapiskat|attawapiskat||CA|1av|1e2|bcb2|-ho25|ne:j64k21|1
Atyrau|atyrau||KZ|55|3x0h|a3iv|b4m8|ne:j64ly7|1
Auburn|auburn||US|23|1l1l|6zm9|-ibko|ne:j642bf|1
Auckland|auckland||NZ|56|tink|-7wbl|11gha|ne:j64n6f|1
Augsburg|augsburg||DE|7k|7ozx|ad2k|2c3s|ne:j646h7|1
Augusta|augusta||US|ks|5mf0|766o|-hklm|ne:j64jvl|1
Augusta|augusta||US|11d|iju|9hwi|-eyfc|ne:j64lbx|1
Aurangabad|aurangabad||IN|11a|nuso|49j4|g55s|ne:j64l7t|1
Aurangabad|aurangabad||IN|88|220p|5b4o|i32w|ne:j64gdd|1
Aurora|aurora||US|ek|clck|8ian|-mgph|ne:j641gt|1
Aurora|aurora||US|pu|7i28|8y9i|-ixbs|ne:j6492d|1
Austin|austin||US|1q4|ovu0|6hk1|-ky7b|ne:j64lal|1
Autlan|autlan|autlan de navarro|MX|qz|10s5|48jo|-mdbo|ne:j645v3|1
Auxerre|auxerre||FR|9e|w18|a8tw|riq|ne:j64fot|1
Avaré|avare||BR|1o6|1qpx|-4ybg|-ahjo|ne:j64815|1
Avarua|avarua||CK||479|-4jju|-y8wu|ne:j64l63|1
Aveiro|aveiro||PT|5b|15si|8pl6|-1ur2|ne:j63vc5|1
Awasa|awasa||ET|1mp|2up5|1ih4|88w2|ne:j640op|1
Aweil|aweil||SS|18y|101d|1vn6|5vf4|ne:j64k81|1
Awjilah|awjilah|awjila|LY|y|53m|68lk|4k91|ne:j64ksh|1
Awka|awka||NG|2y|apsw|1bx4|1ijw|ne:j64d97|1
Ayacucho|ayacucho||PE|5c|3kbu|-2tnq|-fwoo|ne:j64j3h|1
Ayakoz|ayakoz|ayagoz|KZ|hz|zdx|aa3j|h8ll|ne:j64jsd|1
Ayan|ayan||RU|un|zq|c3lq|tm3t|ne:j64jd5|1
Ayapel|ayapel||CO|fp|i8n|1sa0|-g3v0|ne:j64e5f|1
Ayaviri|ayaviri||PE|be|ewe|-36t8|-f4r4|ne:j64azv|1
Aybak|aybak|samangan|AF|1i8|iio|7rsi|el00|ne:j63zb1|1
Aydın|aydin||TR|5d|49ft|841w|5yw4|ne:j644ev|1
Ayorou|ayorou|ayerou|NE|17x|kaa|35o6|73f|ne:j64awt|1
Ayoun el Atrous|ayoun el atrous||MR|on|13j|3klm|-227b|ne:j64lx1|1
Ayr|ayr||GB|1m6|1h9u|bvuw|-zmf|ne:j64abl|1
Ayr|ayr||AU|1fn|706|-4706|vlcb|ne:j64imx|1
Ayutla|ayutla|ayutla de los libres|MX|mm|7mx|3mek|-l9l4|ne:j64d1b|1
Ayutthaya|ayutthaya|phra nakhon si ayutthaya|TH|1di|34cv|32sk|ljzo|ne:j649v5|1
Az Aubayr|az aubayr|az zubayr|IQ|20|5mbv|6ihg|a848|ne:j6470l|1
Az Zahran|az zahran|dhahran|SA|4k|236u|5mv6|ar0v|ne:j64547|1
Az Zarqa|az zarqa|zarqa|JO|1x3|j6cj|6vgc|7qjs|ne:j6468f|1
Az Zawiyah|az zawiyah|zawiya|LY|5f|4abk|70s4|2q5c|ne:j64dd1|1
Azare|azare||NG|7f|29jr|2i4k|26mk|ne:j64d9h|1
Azogues|azogues||EC|c9|1hb3|-l54|-gwc0|ne:j646av|1
Azua|azua||DO|5h|19mr|3ye4|-f5qy|ne:j63xqz|1
Azul|azul||AR|e6|15md|-7vsk|-ctyk|ne:j64hf5|1
B'abda|b abda|baabda|LB|159|6y0|7925|7m6d|ne:j63y2v|1
Babahoyo|babahoyo||EC|zs|1muv|-dvw|-h1qg|ne:j64e3n|1
Babanusa|babanusa||SD|1mf|f78|2fg6|5yi8|ne:j64kiv|1
Babati|babati||TZ|4g|qgj|-wk3|7nuk|ne:j64atb|1
Babruysk|babruysk||BY|11c|4q5h|bdxe|6994|ne:j64i3n|1
Bắc Giang|bac giang|phu lang thuong|VN|5j|15gg|4k3i|mrg0|ne:j649yz|1
Bắc Kạn|bac kan||VN|1xx|mjv|4qs5|mom5|ne:j63tan|1
Bạc Liêu|bac lieu||VN|5k|4tm0|1zlw|mnqo|ne:j64a1l|1
Bacabal|bacabal||BR|12b|1juc|-wn0|-9log|ne:j64jzz|1
Bacău|bacau||RO|5q|4a2c|9zeg|5rpo|ne:j64ayj|1
Bacolod|bacolod||PH|17c|kciy|2a19|qcxl|ne:j64kgf|1
Badajoz|badajoz||ES|j4|304l|8c04|-1hs4|ne:j64a8p|1
Baddeck|baddeck||CA|19o|no|9vpk|-d0s4|ne:j647nv|1
Bade|bade||TW|1p7|3orl|5ckn|pzy5|ne:j640uh|1
Badulla|badulla||LK|5u|10pv|1hvx|hddv|ne:j64ahn|1
Bærum|baerum||NO|z|2fp7|cuan|2fk0|ne:j63vpj|1
Bafang|bafang|baham|CM|1br|1zvd|13w8|26js|ne:j64h87|1
Bafatá|bafata||GW|5v|mx4|2lvq|-355w|ne:j64dpd|1
Bafia|bafia||CM|cg|1hg6|10nk|2eng|ne:j64hlx|1
Bafoulabé|bafoulabe||ML|u2|kp3|2yhg|-2bhk|ne:j64d53|1
Bafoussam|bafoussam||CM|1br|68cw|16d4|28bn|ne:j64h8h|1
Bafra|bafra||TR|1ie|2370|8wqq|7p25|ne:j64agb|1
Bafwasende|bafwasende||CD|1b8|45|8d2|5ue2|ne:j64ejb|1
Bagamoyo|bagamoyo||TZ|1f7|1rlm|-1dos|8c2s|ne:j64arf|1
Bagdarin|bagdarin||RU|ah|3lw|bo0d|ocjk|ne:j64jaf|1
Bagé|bage||BR|1gl|29v6|-6po0|-blfs|ne:j64kxh|1
Baghdad|baghdad||IQ|5x|30bow|759a|9ij3|ne:j64n23|1
Baghlan|baghlan||AF|5y|4osc|7qup|eq35|ne:j64k3h|1
Baglung|baglung||NP|gj|hz4|623v|hwxl|ne:j63vrf|1
Bago|bago|pegu|MM|5z|63dq|3pn4|kopq|ne:j64k7h|1
Baguio|baguio|baguio city|PH|7x|9ljk|3irw|pubn|ne:j64lk5|1
Bahawalpur|bahawalpur||PK|1f3|bue7|6arw|fd1q|ne:j64j4z|1
Bahía Blanca|bahia blanca||AR|e6|618g|-8ax4|-dcfu|ne:j64mpn|1
Bahir Dar|bahir dar||ET|2r|4fj0|2hi9|80g9|ne:j64lxn|1
Bahraich|bahraich||IN|1sy|3wlm|5x4c|hi63|ne:j64gb7|1
Baia Mare|baia mare||RO|129|2xd5|a7qr|51xr|ne:j64axz|1
Baicheng|baicheng||CN|rj|8ai5|9s08|qboo|ne:j64jn5|1
Baie-Comeau|baie comeau||CA|1fv|81v|ajsz|-elws|ne:j647m5|1
Baiquan|baiquan|baiquan county|CN|o5|1idk|a7aq|r0ur|ne:j646on|1
Bairin Zuoqi|bairin zuoqi|baarin left banner|CN|17d|12kw|9fdp|pjmi|ne:j64f0j|1
Bairnsdale|bairnsdale||AU|1tx|8hp|-83w8|vmys|ne:j64ihj|1
Baishan|baishan||CN|rj|72mo|8zaw|r3jg|ne:j646ml|1
Bajram Curri|bajram curri||AL|wh|65b|92n9|4ayp|ne:j63ypj|1
Bakal|bakal||RU|d2|khr|bryr|clo7|ne:j645hn|1
Baker Lake|baker lake||CA|19z|180|ds9u|-kkvb|ne:j64h1z|1
Bakersfield|bakersfield||US|bd|9hx5|7kx0|-pid4|ne:j64jtt|1
Baku|baku||AZ|65|19hks|8npg|aoq3|ne:j64mqb|1
Balakhna|balakhna||RU|18e|1cob|c3wv|9cdk|ne:j645c3|1
Balakovo|balakovo||RU|1jk|49zo|b5gs|a8ts|ne:j64j7l|1
Balancán|balancan||MX|1of|96f|3tcg|-jm90|ne:j645wp|1
Balashov|balashov||RU|1jk|23p7|b1sf|991r|ne:j64cdh|1
Balboa|balboa||PA|1c8|1ciq|1x24|-h1xv|ne:j64j5l|1
Balcarce|balcarce||AR|e6|emv|-83x9|-chgk|ne:j647tx|1
Balıkesir|balikesir||TR|68|5lsc|8hy0|5z78|ne:j64ae1|1
Balikpapan|balikpapan||ID|sl|9k29|-9n8|p1gs|ne:j64lpl|1
Balkanabat|balkanabat||TM|69|2dij|8gvo|bnhd|ne:j649qp|1
Balkh|balkh||AF|6a|3uv5|7vkd|ec79|ne:j64hp3|1
Ballarat|ballarat||AU|1tx|1to5|-81t8|utvk|ne:j64ii5|1
Ballari|ballari|bellary|IN|th|9jnw|38wc|ghha|ne:j64kq7|1
Ballina|ballina||AU|17q|azm|-66p2|wwxs|ne:j64idt|1
Balqash|balqash|balkhash|KZ|1fc|1qs4|a1is|g2bi|ne:j64js7|1
Balsas|balsas||BR|12b|1gig|-1m0w|-9vbo|ne:j64kwf|1
Baltasar Brum|baltasar brum||UY|4c|1xx|-6l44|-caa8|ne:j640y7|1
Bălți|balti||MD|6c|38sb|a8if|5zbh|ne:j64bs3|1
Baltimore|baltimore||US|12o|1cbyw|8f97|-gf7v|ne:j64lbn|1
Balykchy|balykchy||KG|1wf|v9r|93lc|gbum|ne:j64bep|1
Balyqshy|balyqshy||KZ|55|oeg|a362|b47e|ne:j64jrv|1
Bam|bam||IR|ui|24lg|68lh|cibo|ne:j64jsj|1
Bama|bama||NG|96|2j55|2gw4|2xms|ne:j64d6p|1
Bamako|bamako||ML|6e|w0s0|2pmg|-1pqs|ne:j64mld|1
Bambari|bambari||CF|1bm|1bwy|18gk|4fgw|ne:j64m2p|1
Bamenda|bamenda||CM|18p|9jlf|19zk|26bg|ne:j64m3v|1
Bamian|bamian|bamyan|AF|6h|1bqf|7goj|egzu|ne:j64k3f|1
Ban Houayxay|ban houayxay||LA|8v|4wb|4cgn|lisg|ne:j63y6h|1
Banamba|banamba||ML|6e|nlr|2wk0|-1lhg|ne:j64d4p|1
Banda Aceh|banda aceh||ID|7|b0de|16to|kfhs|ne:j64loj|1
Bandar-e-Abbas|bandar e abbas|bandar abbas|IR|ot|9w3f|5twp|c275|ne:j64lyp|1
Bandar-e Bushehr|bandar e bushehr|bushehr|IR|aj|3mg4|675c|aw7g|ne:j64ku1|1
Bandar Lampung|bandar lampung|tanjungkarang telukbetung|ID|y4|iweh|-161s|mki0|ne:j64e0b|1
Bandar Lampung|bandar lampung||ID|y4|ijfs|-15vt|mk95|ne:j64lq1|1
Bandar Seri Begawan|bandar seri begawan||BN|9y|6cs4|11oh|omtx|ne:j64mp7|1
Bandarbeyla|bandarbeyla|bayla|SO|6w|am1|2169|aw3r|ne:j64kg1|1
Bandjarmasin|bandjarmasin|bandjermasin,banjarmasin|ID|sj|cxq0|-pp0|ok3t|ne:j64mih|1
Bandundu|bandundu||CD|6j|2j7n|-pjg|3q3s|ne:j64luf|1
Bandung|bandung||ID|r4|1fb80|-1hm1|n201|ne:j64mw7|1
Banes|banes||CU|op|14z4|4hr1|-g88y|ne:j64e83|1
Banff|banff||CA|29|5se|ayw4|-orrb|ne:j64kz5|1
Banfora|banfora||BF|vx|1aio|2a0w|-10q8|ne:j64ioj|1
Bangassou|bangassou||CF|13e|pc9|10iy|4w1y|ne:j64h9z|1
Banghazi|banghazi|benghazi|LY|7t|pahs|6vtv|4atk|ne:j64mll|1
Bangkok|bangkok|krung thep|TH|6l|3zou8|2y3z|ljkr|ne:j64n11|1
Bangor|bangor||US|11d|12qt|9los|-eqp3|ne:j64jx3|1
Bangui|bangui||CF|6m|htx1|xoy|3z73|ne:j64mpz|1
Baní|bani||DO|1d1|1fh1|3x1s|-f2oe|ne:j63xs1|1
Bani Walid|bani walid||LY|6o|1egg|6t54|2zy4|ne:j64ddh|1
Banja Luka|banja luka||BA|1k4|4r3e|9lj0|3ok8|ne:j64iox|1
Banjul|banjul||GM|6p|x92|2vt7|-3k0t|ne:j64lv1|1
Bannu|bannu||PK|165|dc9f|72jm|f4qq|ne:j64bfl|1
Bansang|bansang||GM|10q|5vj|2vnk|-351g|ne:j64fdp|1
Banská Bystrica|banska bystrica||SK|6r|1rj4|ag11|43rg|ne:j6452d|1
Banyuwangi|banyuwangi||ID|r6|3p1k|-1r8e|oihc|ne:j64e0x|1
Baoding|baoding||CN|o3|nq60|8bxw|or19|ne:j64et3|1
Baoji|baoji||CN|1k8|h5a8|7da0|myrw|ne:j64jjb|1
Baoshan|baoshan||CN|1wj|lfls|5dts|l91o|ne:j64lsf|1
Baotou|baotou||CN|17d|17mzk|8pou|njdl|ne:j64mxv|1
Baqubah|baqubah|ba qubah|IQ|h0|6f2v|78ec|9kkt|ne:j64g8f|1
Bar Harbor|bar harbor||US|11d|4p6|9ihz|-em9o|ne:j649ah|1
Barabinsk|barabinsk||RU|19q|ob8|bv51|gskf|ne:j64chz|1
Barahona|barahona|santa cruz de barahona|DO|6u|1xjk|3wfo|-f8m0|ne:j64fd5|1
Baraki Barak|baraki barak||AF|zg|h7l|7a37|es5f|ne:j63zaf|1
Baramula|baramula|baramulla|IN|r1|3lma|7bw4|fxos|ne:j64fhh|1
Baranavichy|baranavichy||BY|9p|3m84|be08|5kpy|ne:j6487h|1
Barbacena|barbacena||BR|141|2mar|-4jqg|-9dqc|ne:j6476v|1
Barcaldine|barcaldine||AU|1fn|to|-51u6|v50i|ne:j64ijf|1
Barcelona|barcelona||ES|c5|2xgao|8vbw|gty|ne:j64mu5|1
Barcelona|barcelona||VE|3i|cvp6|2660|-dvds|ne:j64997|1
Barcelos|barcelos||BR|2q|9pk|-7iu|-dhiv|ne:j64kvp|1
Barclayville|barclayville||LR|m1|23x|111c|-1r0j|ne:j63wih|1
Barddhaman|barddhaman|bardhaman|IN|1v3|6gt9|4zeg|ityy|ne:j64jsv|1
Bareilly|bareilly||IN|1sy|hieg|62q9|h0sl|ne:j64gbv|1
Bari|bari||IT|3m|aq8x|8t8m|3m6w|ne:j64drl|1
Bariloche|bariloche|san carlos de bariloche|AR|1h9|21lu|-8tik|-fa5k|ne:j64m37|1
Barinas|barinas||VE|6y|63cx|1ucw|-f21w|ne:j6426j|1
Barishal|barishal|barisal|BD|6z|4c1u|4v5o|jdc6|ne:j64i4j|1
Barlett|barlett|bartlett|US|1q0|6507|7js5|-j97v|ne:j642wb|1
Barletta|barletta||IT|3m|2b7a|8uts|3hjg|ne:j6467x|1
Barnaul|barnaul||RU|2h|cumz|bfou|hy6i|ne:j64mev|1
Barquisimeto|barquisimeto||VE|y9|nx40|25k7|-euqj|ne:j64iz1|1
Barra do Bugres|barra do bugres|bugres|BR|136|o5r|-38a0|-c9a4|ne:j64grn|1
Barra do Corda|barra do corda|corda|BR|12b|11qd|-16ig|-9p88|ne:j64gmv|1
Barra do Garças|barra do garcas|garcas|BR|136|14fi|-3ej0|-b78o|ne:j64grf|1
Barra Mansa|barra mansa||BR|1gm|3mp6|-4u2o|-9gtf|ne:j647fj|1
Barrancabermeja|barrancabermeja||CO|1jb|43or|1ipg|-fttw|ne:j646bl|1
Barranquilla|barranquilla||CO|4z|12jcg|2ckz|-g16b|ne:j64lqt|1
Barras|barras||BR|1do|gnx|-wsk|-92e0|ne:j647ed|1
Barreiras|barreiras||BR|60|3e50|-2lo8|-9n80|ne:j64m17|1
Barreiros|barreiros||BR|1d4|rfx|-1w4o|-7jls|ne:j64hkd|1
Barretos|barretos||BR|1o6|263o|-4ekc|-aeug|ne:j6481n|1
Barrie|barrie||CA|1av|3wgp|9igu|-h2yw|ne:j64h4b|1
Barstow|barstow||US|bd|gan|7ha6|-p2y3|ne:j648g5|1
Bartica|bartica||GY|1e6|8w4|1dgo|-cke4|ne:j64a7j|1
Bartlesville|bartlesville||US|1ao|qpe|7vjk|-kkla|ne:j641tn|1
Baruun-Urt|baruun urt||MN|1oc|c71|a0c8|oa3l|ne:j64jfv|1
Barysaw|barysaw||BY|143|3bwd|bmes|63ui|ne:j64i45|1
Basankusu|basankusu||CD|f9|14ag|9ip|48s0|ne:j64ed7|1
Base Presidente Montalva|base presidente montalva|base presidente eduardo frei montalva,formerly teniente rodolfo marsh station|AQ||46|-dbsz|-cmj9|ne:j64iuf|1
Basel|basel||CH|73|hsfk|a74s|1mkc|ne:j64au5|1
Basoko|basoko||CD|1b8|xq5|9kk|520s|ne:j64ejn|1
Basra|basra|al basrah|IQ|20|inao|6jgj|a8x0|ne:j64lyn|1
Bassar|bassar||TG|t6|1bpx|1zgi|636|ne:j63t3j|1
Basse Santa Su|basse santa su||GM|1sl|b3g|2up8|-31qu|ne:j63xwn|1
Basse-terre|basse terre||GP|m9|8j|3fjc|-d84f|ne:j64glp|1
Basseterre|basseterre||KN||gvz|3pi4|-dfxe|ne:j64m77|1
Bastia|bastia||FR|f5|vmx|95i0|20x0|ne:j64fnx|1
Bata|bata||GQ|zb|3piu|efg|23dw|ne:j64knb|1
Batagay|batagay||RU|1hy|3ai|ei1c|suum|ne:j64lkz|1
Batangas|batangas|batangas city|PH|78|93jw|2yc9|pxt5|ne:j64kgp|1
Batatais|batatais||BR|1o6|143s|-4h6s|-a77g|ne:j6481j|1
Bataysk|bataysk||RU|1h1|2cui|a3pk|8io9|ne:j645e1|1
Batemans Bay|batemans bay||AU|17q|859|-7nds|w709|ne:j64ial|1
Bath|bath||GB|7a|1zxy|b0h9|-i4s|ne:j64acf|1
Bathurst|bathurst||AU|17q|4pr|-75v8|w238|ne:j64ic7|1
Bathurst|bathurst||CA|17l|4pr|a7a8|-e2k4|ne:j64l1f|1
Bati|bati||ET|2r|ev0|2eal|8krq|ne:j64fx7|1
Batman|batman||TR|7c|6h2y|84d4|8tfs|ne:j64akj|1
Batna|batna||DZ|7d|60ny|7mgk|1blw|ne:j64l4p|1
Baton Rouge|baton rouge||US|zy|91o8|6j0j|-jj8q|ne:j64laf|1
Batouri|batouri||CM|j0|xt9|y7l|32uq|ne:j64hmj|1
Battambang|battambang|batdambang|KH|79|3bf9|2t2w|m4ao|ne:j64m43|1
Batticaloa|batticaloa||LK|7e|2rpi|1njm|hieg|ne:j64ahb|1
Battle Creek|battle creek||US|13u|1in8|92jv|-i991|ne:j643c5|1
Batu Pahat|batu pahat||MY|ro|4a0z|ea0|m28l|ne:j64bgx|1
Batumi|batumi|bat umi|GE|x|3c0m|8wzk|8x7w|ne:j64jr5|1
Baturité|baturite||BR|ca|hap|-xeo|-8c00|ne:j64gv1|1
Baubau|baubau||ID|1nj|iu4|-167f|qa43|ne:j64dnn|1
Bauchi|bauchi||NG|7f|6rxx|27k0|23xc|ne:j64d9l|1
Baures|baures||BO|id|1va|-2ws8|-dml5|ne:j647r7|1
Bauru|bauru||BR|1o6|76i8|-4sas|-aipc|ne:j64l2p|1
Bávaro|bavaro||DO|xb|m3|40f6|-eo5w|ne:j64fdd|1
Bawku|bawku||GH|1sj|1ksa|2dcc|-1uo|ne:j64fef|1
Bay City|bay city||US|13u|1gw5|9cdl|-hzah|ne:j643cn|1
Bay City|bay city||US|1q4|eef|67mb|-kkgs|ne:j648ud|1
Bayamo|bayamo||CU|m2|44mw|4d8z|-gfdt|ne:j64e7z|1
Bayan Obo|bayan obo||CN|17d|l78|8ya4|nkjj|ne:j64f1b|1
Bayankhongor|bayankhongor||MN|7j|k98|9x94|ln6x|ne:j64jf7|1
Baydhabo|baydhabo|baidoa|SO|7g|2s6n|o2o|9ct0|ne:j64kdn|1
Bayghanin|bayghanin|bayganin|KZ|3s|5wp|afph|bz4k|ne:j64g0b|1
Baykonur|baykonur|baikonur,leninsk|KZ|1fw|rwv|9sk2|djz1|ne:j64jrt|1
Baytown|baytown||US|1q4|1udu|6dli|-kcrx|ne:j64255|1
Beaufort|beaufort||US|1m7|oei|6y8y|-halr|ne:j64917|1
Beaufort West|beaufort west||ZA|1vf|yip|-6xm0|4u5g|ne:j64bjd|1
Beaumont|beaumont||US|1q4|2e0t|6g5b|-k63d|ne:j648u7|1
Beaver Falls|beaver falls||US|1cy|2kot|8qfz|-h7qy|ne:j6434z|1
Béchar|bechar||DZ|ar|32mu|6rwv|-h7g|ne:j64l3z|1
Beckley|beckley||US|1vb|t70|83ii|-heeu|ne:j6496f|1
Bedourie|bedourie||AU|1fn|3y|-57vs|tw4q|ne:j64iln|1
Beer Sheva|beer sheva|beersheba|IL|n5|4f9k|6p4k|7gr0|ne:j646zh|1
Beeville|beeville||US|1q4|a18|636k|-ky90|ne:j648up|1
Behbehan|behbehan|behbahan|IR|uz|1u4r|6jyy|artj|ne:j64g65|1
Bei'an|bei an|beian|CN|o5|3bjs|ac7q|r3xw|ne:j64ltt|1
Beihai|beihai||CN|mf|fmhe|4lqs|ndtk|ne:j64dvn|1
Beijing|beijing||CN|7m|6m1g0|8k3w|oy1j|ne:j64n3f|1
Beipiao|beipiao||CN|ys|4wbn|8ylw|pvsg|ne:j646kx|1
Beira|beira||MZ|1lm|bdf0|-48xk|7h24|ne:j64mdz|1
Beirut|beirut|bayrut|LB|7n|13kds|79df|7lza|ne:j64mlp|1
Beitbridge|beitbridge||ZW|131|kez|-4rdc|6fek|ne:j64a5h|0
Béja|beja||TN|as|19yn|7vew|1yws|ne:j649el|1
Beja|beja||PT|7o|rny|85bg|-1oo6|ne:j63vef|1
Béjaïa|bejaia||DZ|at|890p|7vn8|134c|ne:j64i0n|1
Bekasi|bekasi||ID|qw|1ez1f|-1bz1|mxej|ne:j64e01|1
Békéscsaba|bekescsaba||HU|au|1eba|a04g|4ite|ne:j63u75|1
Bekiy|bekiy|bekily|MG|1qz|3b2|-56uq|9pny|ne:j64boz|1
Bélabo|belabo||CM|j0|heh|122h|2umg|ne:j64hmn|1
Belagavi|belagavi|belgaum|IN|th|d1pw|3eey|fyvu|ne:j64kqb|1
Belaya Kalitva|belaya kalitva||RU|1h1|1142|abt5|8qph|ne:j64c2l|1
Belebey|belebey||RU|74|1cae|blnv|blkz|ne:j64c71|1
Beledweyne|beledweyne||SO|oh|1ckh|10ko|9ork|ne:j64kfx|1
Belém|belem||BR|1ck|1ag2g|-b69|-ae38|ne:j64mz5|1
Belen|belen||AR|c6|8rj|-5xcg|-ed8d|ne:j64hg5|1
Belén|belen||PY|es|8rj|-513b|-c9o0|ne:j64b41|1
Belfast|belfast||GB|7p|9nja|bpao|-19zk|ne:j64ldl|1
Belgorod|belgorod||RU|7q|7efd|aunw|7uen|ne:j64ket|1
Belgrade|belgrade||RS|ls|njzs|9lu6|4dx0|ne:j64mp3|1
Belgrano II Base|belgrano ii base|general belgrano ii station|AQ||2s|-gotj|-7f3r|ne:j64ivx|1
Belize City|belize city|belize|BZ|7r|1cms|3r0r|-iwgs|ne:j64hkx|1
Bell Ville|bell ville||AR|fp|r35|-6zjk|-dfn4|ne:j647v5|1
Bella Bella|bella bella||CA|9t|12w|b6do|-rgk5|ne:j64h01|1
Bella Unión|bella union||UY|4c|hj7|-6hhg|-ccg0|ne:j648aj|1
Bella Vista|bella vista|bella vista norte|PY|2l|d04|-4qr4|-c440|ne:j64b4n|1
Belleville|belleville||US|pu|3318|899g|-jag2|ne:j6492h|1
Belleville|belleville||CA|1av|xxy|9gsj|-gl3d|ne:j647kd|1
Bellingham|bellingham||US|1ux|24we|ag8h|-q945|ne:j648e5|1
Bellinzona|bellinzona||CH|1qg|csc|9wgi|1xlk|ne:j63uj5|1
Bello|bello||CO|3c|b4za|1cuc|-g73o|ne:j64jhd|1
Belmopan|belmopan||BZ|c8|bqs|3p48|-j0xj|ne:j64mpx|1
Belo Horizonte|belo horizonte||BR|141|3bhp4|-49nf|-9ev5|ne:j64m0h|1
Belogorsk|belogorsk||RU|2t|1i63|aww7|rj8d|ne:j64cox|1
Belomorsk|belomorsk||RU|td|9dx|dtvo|7g96|ne:j64j63|1
Bemidji|bemidji||US|142|bf0|a6b4|-kc3m|ne:j64jtb|1
Ben Gardane|ben gardane||TN|15y|fb7|73po|2eko|ne:j649dz|1
Bend|bend||US|1b3|1m7l|9g27|-q018|ne:j64jud|1
Bendigo|bendigo||AU|1tx|1r09|-7vn4|ux9s|ne:j64m67|1
Benevento|benevento||IT|bi|1bof|8te1|35t8|ne:j64drh|1
Bengaluru|bengaluru||IN|th|41gvs|2s3b|gmfx|ne:j64n1z|1
Bengbu|bengbu||CN|36|j5tc|729b|p5b5|ne:j64jgx|1
Bengkulu|bengkulu||ID|7u|9581|-tbk|lx4c|ne:j64km3|1
Benguela|benguela||AO|7w|38oq|-2p1z|2vg8|ne:j64m4b|1
Benha|benha|banha|EG|1v|3kvp|6j2z|6om1|ne:j63x8x|1
Beni|beni||CD|18o|74vb|3s8|6b8k|ne:j64fbn|1
Beni Mazar|beni mazar||EG|1t|1pdt|63u0|6lqc|ne:j64eh1|1
Béni Ounif|beni ounif||DZ|5o|4cc|6val|-9nm|ne:j64hy5|1
Beni Suef|beni suef||EG|6n|ahnu|68dw|6nw4|ne:j64eh5|1
Benin City|benin city||NG|i9|pi7k|1cxs|17cl|ne:j64l6v|1
Benito Juárez|benito juarez|juarez|AR|e6|86p|-82mn|-ctf4|ne:j64he5|1
Benoni|benoni|east rand,ekurhuleni|ZA|kk|1s00g|-5lr8|62kw|ne:j64j5f|1
Bensonville|bensonville||LR|14s|35l|1dn1|-29sg|ne:j63wjt|1
Bentiu|bentiu||SS|1sh|5wl|1z8t|6e71|ne:j640gx|1
Bento Gonçalves|bento goncalves||BR|1gl|20qn|-692n|-b1j4|ne:j64gsj|1
Benton Harbor|benton harbor||US|13u|191q|90z2|-ij32|ne:j643bt|1
Benxi|benxi||CN|ys|lov4|8ux7|qiuh|ne:j64jlx|1
Berat|berat||AL|80|105u|8q4c|4a3s|ne:j63ysl|1
Berber|berber||SD|1gp|128k|3v0q|7a7t|ne:j64a9z|1
Berbera|berbera||||56zs|28ir|9nck|ne:j64m7d|1
Berbérati|berberati||CF|11m|1bp3|wsk|3drc|ne:j64kjp|1
Berdyansk|berdyansk|berdiansk|UA|1x2|2j9o|a0s0|7vuk|ne:j6441j|1
Berekum|berekum||GH|9w|zpr|1lhk|-jzg|ne:j64fet|1
Berenice|berenice|berenice troglodytica|EG|15|a|54ro|7lsq|ne:j64eih|1
Berens River|berens river||CA|121|os|b82a|-kspp|ne:j647gt|1
Berezniki|berezniki||RU|1d3|3lfo|cqhk|c5yo|ne:j64khv|1
Bergamo|bergamo||IT|zj|4abk|9smk|22m4|ne:j64dtp|1
Bergen|bergen||NO|os|4ksx|cxza|1531|ne:j64mcz|1
Beringovskiy|beringovskiy|beringovsky|RU|dy|1fp|dim7|12fjf|ne:j64bwl|1
Berkeley|berkeley||US|bd|amzo|848j|-q7g8|ne:j641cv|1
Berlin|berlin||DE|82|21034|b99y|2ve4|ne:j64n1l|1
Bermejo|bermejo||BO|1pf|s74|-4vds|-dsj0|ne:j64hxn|1
Bern|bern||CH|83|5wg1|a20f|1lm6|ne:j64lnt|1
Berri|berri||AU|1m5|3n0|-7cj1|u4vk|ne:j64ieb|1
Bertoua|bertoua||CM|j0|4oan|zcc|2xk0|ne:j64hmb|1
Besalampy|besalampy||MG|118|se|-3l8n|9j8h|ne:j64boh|1
Besançon|besancon||FR|jr|2r3e|a4fg|1aj0|ne:j646ub|1
Bestobe|bestobe||KZ|3q|5jp|b939|fo1h|ne:j6462p|1
Betanzos|betanzos||BO|1eg|3qn|-46xc|-e10k|ne:j6485t|1
Bethal|bethal||ZA|15i|26n3|-5o8o|6b8k|ne:j64bmx|1
Bethanie|bethanie|bethanien|NA|tb|7zv|-5ogz|3obw|ne:j64djp|1
Bethel|bethel||US|26|4t0|d131|-yo46|ne:j64ma7|1
Bethlehem|bethlehem||ZA|1az|1sjq|-61qs|62d4|ne:j64blt|1
Beyla|beyla||GN|1a4|a6s|1v12|-1usq|ne:j63yhx|1
Beyneu|beyneu||KZ|11u|p1g|9omy|bt5k|ne:j64kud|1
Bezhetsk|bezhetsk||RU|1s1|qsw|cdpr|7v3o|ne:j64bzx|1
Béziers|beziers||FR|y7|1qu6|9aht|oro|ne:j64fo5|1
Bhagalpur|bhagalpur||IN|88|7qz0|5eoc|in54|ne:j64lzf|1
Bhairawa|bhairawa|siddharthanagar|NP|10a|1cw7|5wg5|hve1|ne:j63vsh|1
Bharatpur|bharatpur||IN|1fz|4wzs|5u9k|glzs|ne:j64g9x|1
Bhatpara|bhatpara||IN|1v3|acs9|4wbc|iz0w|ne:j64gcn|1
Bhavnagar|bhavnagar||IN|fq|bw82|4o1k|fgk4|ne:j64gg1|1
Bhilai|bhilai|durg bhilainagar|IN|d7|nig8|4jq2|hgbu|ne:j64mmf|1
Bhilwara|bhilwara||IN|1fz|8cuv|5fls|fzvy|ne:j64g9b|1
Bhimphedi|bhimphedi|bhimfedi|NP|16y|bko|5wl2|i8v8|ne:j63vuv|1
Bhisho|bhisho|bisho|ZA|i3|3g85|-71mk|5vcc|ne:j64kdl|1
Bhiwandi|bhiwandi||IN|11a|h1fc|45bk|fo9d|ne:j64jpb|1
Bhiwani|bhiwani||IN|nr|439j|66as|gbdu|ne:j646s1|1
Bhopal|bhopal||IN|10u|110k8|4zev|gla8|ne:j64mmh|1
Bhubaneswar|bhubaneswar|bhubaneshwar|IN|1b9|i38g|4cf8|ie8e|ne:j64m81|1
Bhuj|bhuj|bhojpur|IN|fq|67bp|4zeg|eyno|ne:j64gfx|1
Bhusawal|bhusawal||IN|11a|3x7d|4i6w|g93w|ne:j646sn|1
Biak|biak||ID|1cc|27y2|-8yn|t5r9|ne:j64do1|1
Białystok|bialystok||PL|1e2|6973|be40|4ys4|ne:j64dg3|1
Biarritz|biarritz||FR|3t|345g|9bfx|-c1s|ne:j646tf|1
Bicheno|bicheno||AU|1pl|4x|-8z4w|vs7a|ne:j64inj|1
Bida|bida||NG|185|3q55|1y2c|1adg|ne:j64d7v|1
Bidar|bidar||IN|th|6fl4|3ual|gm4n|ne:j64fkh|1
Biel|biel|biel bienne|CH|83|1oqc|a3xu|1jxw|ne:j644p3|1
Bielefeld|bielefeld||DE|18u|743m|b5gs|1ttg|ne:j646fd|1
Biên Hòa|bien hoa||VN|1xy|dzl2|2cn8|mwb1|ne:j64jz3|1
Bifoum|bifoum|bifoun|GA|15d|3q|-2kh|2848|ne:j64flz|1
Big Beaver House|big beaver house||CA|1av|a|bckc|-j9jl|ne:j647lf|1
Big Delta|big delta||US|26|gf|dr05|-v9bq|ne:j643tx|1
Big Spring|big spring||US|1q4|im2|6wsg|-lqzk|ne:j6422l|1
Biggar|biggar||CA|1jo|1ow|b5mg|-n57d|ne:j64gyx|1
Biharamulo|biharamulo||TZ|sd|q9i|-kag|6pl8|ne:j64apb|1
Bijar|bijar||IR|w1|15kf|7ot1|a78h|ne:j64g85|1
Bikaner|bikaner||IN|1fz|ccgf|60a8|fptf|ne:j64g9t|1
Bikin|bikin||RU|un|f63|a19n|srzt|ne:j64crd|1
Bila Tserkva|bila tserkva||UA|v4|49ob|ao27|6ghp|ne:j643yz|1
Bilaspur|bilaspur||IN|d7|bnby|4qg8|hly8|ne:j64gdh|1
Bilbao|bilbao||ES|1ct|irkw|99pw|-mlw|ne:j64lff|1
Bilecik|bilecik||TR|8a|v31|8lss|6fcm|ne:j63tmp|1
Bilibino|bilibino||RU|dy|4fx|el2w|znfp|ne:j64bwp|1
Billings|billings||US|14o|28o8|9taz|-n9i0|ne:j64l8v|1
Biloela|biloela||AU|1fn|4v9|-5880|w98h|ne:j64imb|1
Biloxi|biloxi||US|149|132s|6ija|-j1ud|ne:j64izh|1
Biltine|biltine||TD|1up|8hk|3451|4he7|ne:j64knd|1
Bilwi|bilwi|puerto cabezas|NI|50|x6h|30a5|-hve2|ne:j64j3p|1
Binga|binga||CD|f9|1dvj|ie2|4dk8|ne:j64ed5|1
Binghamton|binghamton||US|17s|2zxz|90u6|-g9sf|ne:j64977|1
Bingöl|bingol||TR|8b|1q60|8c1e|8ohg|ne:j63trb|1
Binjai|binjai||ID|1nn|c3xv|rxo|l415|ne:j64dmb|1
Bintulu|bintulu||MY|1jm|38zl|ofk|o86w|ne:j64bhv|1
Bir Anzarane|bir anzarane||MA|1bq|539|54ad|-3451|ne:j64dm5|1
Bir Lehlou|bir lehlou||EH||dw|5ljc|-22h9|ne:j64l5f|1
Bir Mogrein|bir mogrein|bir moghrein|MR|1qm|a|5ep9|-2hdl|ne:j64krl|1
Birak|birak|brak|LY|4l|z1p|5wg5|327m|ne:j64ks7|1
Birao|birao||CF|1t3|7uq|27cl|4vsp|ne:j64h9h|1
Biratnagar|biratnagar||NP|86|3wok|5ocl|iphd|ne:j64bg3|1
Birdsville|birdsville||AU|1fn|7v|-5juc|tvcy|ne:j64ilj|1
Birganj|birganj|birgunj|NP|16y|2ut2|5sc4|i6u2|ne:j64bfz|0
Birjand|birjand||IR|1me|6yjj|71pc|coxz|ne:j64kul|1
Birmingham|birmingham||GB|1v8|1cz48|b8wx|-etv|ne:j64ldj|1
Birmingham|birmingham||US|23|o6en|76pw|-ily2|ne:j64iz7|1
Birni Nkonni|birni nkonni|birni n konni|NE|1op|1eck|2yeo|14l3|ne:j64awx|0
Birnin Kebbi|birnin kebbi||NG|u7|2bgk|2o2g|wen|ne:j64dbj|1
Birobidzhan|birobidzhan||RU|1w8|1mr6|agiu|shus|ne:j64jcv|1
Birsk|birsk||RU|74|vna|bvno|bwl0|ne:j64kez|1
Biryusinsk|biryusinsk||RU|qg|7e7|bzsn|kyqo|ne:j64cml|1
Bishkek|bishkek||KG|8e|hxu0|96tq|fzhl|ne:j64mhp|1
Bishop|bishop||US|bd|3q3|80aw|-pdj9|ne:j648i3|1
Biskra|biskra||DZ|8f|4bxz|7gzc|187o|ne:j64l4j|1
Bismarck|bismarck||US|190|1da7|a16b|-llnd|ne:j64m8b|1
Bissau|bissau||GW|8h|8n7v|2jju|-3ccw|ne:j64mhf|1
Bistrița|bistrita||RO|8i|1qqu|a3pw|5956|ne:j63uov|1
Bitam|bitam||GA|1vo|dlx|g2t|2glu|ne:j64fg5|1
Bitlis|bitlis||TR|8j|1cgr|8890|910u|ne:j63trp|1
Bitola|bitola||MK|8k|1urk|8snr|4knn|ne:j64dcd|1
Biu|biu||NG|96|21b1|29y4|2m24|ne:j64d6l|1
Biysk|biysk||RU|2h|4m86|b9ct|i994|ne:j64cfp|1
Bizerte|bizerte||TN|8l|2zwj|7zqg|241i|ne:j649ep|1
Black River|black river||JM|1hq|39h|3v4m|-gopk|ne:j63x0f|1
Blackpool|blackpool||GB|y6|5uhk|bjcw|-nj8|ne:j64adf|1
Blacksburg|blacksburg||US|1u5|1g38|7z9i|-h8ha|ne:j642wp|1
Blagodarnyy|blagodarnyy|blagodarny|RU|1mx|rrv|9o13|9b54|ne:j64bvx|1
Blagoveshchensk|blagoveshchensk||RU|2t|4qr4|aruy|rc1x|ne:j64lkp|1
Blantyre|blantyre||MW|8n|cjal|-3du4|7hzf|ne:j64lux|1
Blenheim|blenheim||NZ|12j|ndo|-8wbj|11a8u|ne:j64n65|1
Blida|blida||DZ|8p|ayk4|7t0r|lu4|ne:j64i0t|1
Blitar|blitar||ID|r6|2u68|-1q9k|o1cs|ne:j64e1t|1
Bloemfontein|bloemfontein||ZA|1az|9xaw|-68ow|5me3|ne:j64mdf|1
Bloemhof|bloemhof||ZA|198|d7m|-5xcg|5hgc|ne:j64blf|1
Bloomington|bloomington||US|pu|2rir|8odq|-j2og|ne:j6491z|1
Bloomington|bloomington||US|q5|25ee|8e7d|-ijn4|ne:j6492j|1
Bluefields|bluefields||NI|51|y8l|2klc|-hyc1|ne:j64k9x|1
Blumenau|blumenau||BR|1j7|6at9|-5rps|-ais4|ne:j647cb|1
Bo|bo||SL|1mm|3qj6|1phw|-2il4|ne:j64ka3|1
Boa Vista|boa vista||BR|1gz|51fy|lq9|-d03o|ne:j64mof|1
Boaco|boaco||NI|8r|meu|2o7w|-icyg|ne:j644zz|1
Bobo Dioulasso|bobo dioulasso||BF|ov|7puy|2e9k|-x3o|ne:j64m6p|1
Bocaiúva|bocaiuva||BR|141|os2|-3o0o|-9e1g|ne:j64gqx|1
Bocas del Toro|bocas del toro||PA|8s|7mj|2016|-hmmj|ne:j6458x|1
Bodaybo|bodaybo||RU|qg|cal|cf9e|oi62|ne:j64j9l|1
Bodø|bodo||NO|18t|qah|ef3w|33c5|ne:j64j35|1
Boende|boende||CD|1xr|orf|-1p0|4gyg|ne:j64edf|1
Boffa|boffa||GN|8u|1ss|26l6|-30cu|ne:j63yf5|1
Bogandé|bogande||BF|lb|7lq|2s2i|-12c|ne:j64011|1
Bogor|bogor||ID|r4|joc0|-1eoh|mvo9|ne:j64km1|1
Bogoroditsk|bogoroditsk||RU|1rt|uip|bixf|863c|ne:j64c33|1
Bogota|bogota||CO|8t|4mkww|zhc|-fvn9|ne:j64n3l|1
Bogotol|bogotol||RU|wc|i86|c1rp|j6q8|ne:j645mf|1
Bogue|bogue|boghe|MR|9k|81b|3k0g|-323w|ne:j64d45|1
Boise|boise||US|pq|78uv|9chi|-owtf|ne:j64m8d|1
Bojnurd|bojnurd|bojnord|IR|193|4gxy|814c|caa8|ne:j6471n|1
Boké|boke||GN|8u|2hpq|2cew|-32c8|ne:j64kv5|1
Bol|bol||TD|xq|2jr|2vum|35jf|ne:j64ee1|1
Bol'sheretsk|bol sheretsk||RU|sq|a|b8me|xih6|ne:j64dlt|1
Bolama|bolama||GW|8x|8b5|2hdi|-3bgs|ne:j64dp7|1
Bolgatanga|bolgatanga||GH|1sj|1rep|2b9c|-6k4|ne:j64feb|1
Boli|boli||CN|o5|21i4|9t24|rzj3|ne:j64f3x|1
Bollnäs|bollnas||SE|my|ac6|d5e8|3iaa|ne:j649lb|1
Bolobo|bolobo||CD|6j|lhy|-gnv|3hb4|ne:j64f6j|1
Bologna|bologna||IT|il|agoc|9jd8|2fi0|ne:j64dqd|1
Bologoye|bologoye||RU|1s1|jee|cejm|7aqu|ne:j64c07|1
Bolu|bolu||TR|8z|22k5|8qbn|6rvh|ne:j64aen|1
Bolzano|bolzano||IT|1rl|21zr|9yss|2fnk|ne:j64dtz|1
Bom Jesus da Lapa|bom jesus da lapa||BR|60|veb|-2u8f|-9b6o|ne:j64gwx|1
Boma|boma||CD|70|3tu6|-18zg|2sp0|ne:j64kov|1
Bombo|bombo||UG|6g|1lvc|4i1|6z11|ne:j63u0z|1
Bonao|bonao||DO|14n|1kj9|425o|-f3a2|ne:j63xrh|1
Bondo|bondo||CD|1b8|i59|tec|52n0|ne:j64ko1|1
Bondoukou|bondoukou||CI|1x0|18zd|1pyo|-lls|ne:j64gkd|1
Bongandanga|bongandanga||CD|1xr|361|bnk|4if8|ne:j64ecx|1
Bongaree|bongaree||AU|1fn|aj5|-5sxv|wtpx|ne:j64ikb|1
Bongor|bongor||TD|13a|45n9|27d7|3aq8|ne:j64ef1|1
Bonn|bonn||DE|18u|el3z|avd1|1imo|ne:j64ekd|1
Bontang|bontang||ID|sl|26gr|111|p6mw|ne:j64jh3|1
Boorama|boorama|borama|||1g7k|24p8|996g|ne:j64it7|1
Boosaaso|boosaaso|bosaso|SO|6w|108p|2f1c|ajh4|ne:j64kfz|1
Bor|bor||SS|rs|kny|1bw8|6rif|ne:j64kal|1
Boralday|boralday||KZ|2e|g78|9ad9|ggtc|ne:j6463v|1
Borås|boras||SE|1uo|1e5s|cdg8|2row|ne:j64auf|1
Bordeaux|bordeaux||FR|3t|h7lk|9m2w|-4lu|ne:j64lw3|1
Bordertown|bordertown||AU|1m5|1zr|-7s7u|u65u|ne:j64if1|1
Bordj Bou Arréridj|bordj bou arreridj||DZ|94|300w|7qdl|10rj|ne:j63zht|1
Borgarnes|borgarnes||IS|1ts|1dj|du7z|-4oov|ne:j640cd|1
Borisoglebsk|borisoglebsk||RU|1ug|1gxh|b0d3|90rb|ne:j645h3|1
Borlänge|borlange||SE|fy|uf2|cyox|3ayf|ne:j643v5|1
Borovichi|borovichi||RU|19p|18nz|cilm|79jy|ne:j64bxl|1
Borujerd|borujerd||IR|zm|5eeu|79q8|agjk|ne:j6470h|1
Borzya|borzya||RU|dn|nh1|assu|oz2a|ne:j64jb5|1
Bose|bose|baicheng|CN|mf|3r8y|54et|mumt|ne:j64lp3|1
Bosobolo|bosobolo||CD|1xr|b89|wc0|49e8|ne:j64edt|1
Bossangoa|bossangoa||CF|1bs|1cns|1e11|3qn8|ne:j64h9d|1
Bossembélé|bossembele||CF|6m|5mf|14n2|3s6s|ne:j64hlb|1
Boston|boston||US|12y|2nqrc|92mv|-f8e8|ne:j64mtj|1
Botoșani|botosani||RO|98|2gkf|a8fg|5pph|ne:j64axt|1
Botucatu|botucatu||BR|1o6|2fuu|-4wjg|-aduc|ne:j64hjv|1
Bouaflé|bouafle||CI|128|1b1e|1huc|-18co|ne:j63ykh|1
Bouaké|bouake||CI|1t8|c5vd|1nc4|-12t8|ne:j64m01|1
Bouar|bouar||CF|16t|qis|19ws|3cdc|ne:j64l1t|1
Bougouni|bougouni||ML|1l1|rcq|2g4c|-1lsk|ne:j64d5v|1
Bouïra|bouira||DZ|9b|2czk|7spp|u3c|ne:j64i0x|1
Boulder|boulder||US|ek|2mci|8kxs|-mk31|ne:j648jx|1
Boulder City|boulder city||US|17j|bxz|7pm6|-om1o|ne:j648k1|1
Boulia|boulia||AU|1fn|go|-4wp0|tzh4|ne:j64ilt|1
Boulsa|boulsa||BF|16m|dht|2pnu|-4e2|ne:j63zxz|1
Bourem|bourem||ML|ki|n5c|3mek|-2p8|ne:j64ctb|1
Bourges|bourges||FR|cg|1jtg|a3at|iio|ne:j64fp1|1
Bourke|bourke||AU|17q|1wr|-6g94|va11|ne:j64891|1
Bournemouth|bournemouth||GB|9f|95fl|avfo|-ens|ne:j644cv|1
Boutilimit|boutilimit||MR|1rg|awu|3rf4|-35fc|ne:j64d4b|1
Bowen|bowen||AU|1fn|8h3|-4abx|vrl3|ne:j64k6z|1
Bowling Green|bowling green||US|uf|1iw4|7xf7|-ij04|ne:j6492x|1
Bowling Green|bowling green||US|1aj|sm0|8v8z|-hxgi|ne:j642tz|1
Boyarka|boyarka||RU|1pq|rr4|f61i|kwbc|ne:j64co1|1
Bozeman|bozeman||US|14o|ynt|9sgx|-nsru|ne:j648cd|1
Bozoum|bozoum||CF|1bt|v0p|1cqq|3iex|ne:j64dpp|1
Bradford|bradford||GB|1vc|ar44|bj4g|-di4|ne:j644m1|1
Braga|braga||PT|9h|hpzl|8wn2|-1sz9|ne:j6450d|1
Bragança|braganca||BR|1ck|183v|-83o|-a0vo|ne:j64k01|1
Bragança|braganca||PT|9i|qiv|8ylc|-1g4e|ne:j63vgt|1
Bragança Paulista|braganca paulista||BR|1o6|2qik|-4x30|-9z6k|ne:j647zf|1
Brahmapur|brahmapur|berhampur|IN|1b9|6yk6|452o|i6bk|ne:j64jp5|1
Brăila|braila||RO|9j|4ksh|9ph4|5zt6|ne:j63usn|1
Brainerd|brainerd||US|142|lqz|9xp8|-k6uw|ne:j6415x|1
Brandfort|brandfort||ZA|1az|9bv|-65g4|5o8s|ne:j64bln|1
Brandon|brandon||CA|121|lxe|aoil|-lf7w|ne:j64m1h|1
Brasília|brasilia||BR|gx|27o1w|-3drq|-a9qk|ne:j64mz7|1
Brașov|brasov||RO|9m|6o04|9s7v|5hl4|ne:j64ayb|1
Bratislava|bratislava||SK|9n|92yh|abj0|3o2q|ne:j64lg7|1
Bratsk|bratsk||RU|qg|5a30|c1b6|ls2e|ne:j64mfd|1
Braunschweig|braunschweig|brunswick|DE|182|58tn|b75w|290o|ne:j646gl|1
Brazzaville|brazzaville||CG|1e8|t1iw|-wuk|39x7|ne:j64mmp|0
Bredasdorp|bredasdorp||ZA|1vf|biw|-7efj|4ajw|ne:j64bj7|1
Bregenz|bregenz||AT|1ue|ks0|a6n3|23cz|ne:j63zl7|1
Bremen|bremen||DE|9o|fjcd|bdkg|1vwg|ne:j64jif|1
Bremerhaven|bremerhaven||DE|9o|2yaf|bh74|1u7c|ne:j64el3|1
Bremerton|bremerton||US|1ux|2pus|a72w|-qab8|ne:j648en|1
Brest|brest||BY|9p|6g17|b608|52vc|ne:j64m4v|1
Brest|brest||FR|9q|33sz|adds|-yom|ne:j64fnb|1
Breves|breves||BR|1ck|10e4|-cyo|-atl0|ne:j64kwh|1
Bria|bria||CF|nz|meb|1eet|4pmh|ne:j64kjv|1
Bridgeport|bridgeport|bridgeport stamford|US|et|lths|8trf|-fotv|ne:j64l6j|1
Bridgetown|bridgetown||BB|1hu|43hs|2t3g|-cs05|ne:j64m4j|1
Brighton|brighton||GB|9r|as4g|aw7j|-1b8|ne:j64ain|1
Brikama|brikama||GM|6p|46kg|2uh0|-3kjr|ne:j64fdv|1
Brindisi|brindisi||IT|3m|28l1|8pkz|3uck|ne:j64drz|1
Brisbane|brisbane||AU|1fn|13v6o|-5vtv|wst7|ne:j64mrl|1
Bristol|bristol||GB|9s|bv3s|b0zo|-jxl|ne:j644ch|1
Bristol|bristol||US|1u5|sw3|7uhv|-hm2o|ne:j64951|1
Brits|brits||ZA|198|2mip|-5hrc|5yco|ne:j64blb|1
Brive|brive|brive la gaillarde|FR|z4|16s8|9ods|btx|ne:j64fpv|1
Brno|brno||CZ|wa|8blh|ajms|3k5w|ne:j64enp|1
Brochet|brochet||CA|121|7q|cemo|-lsgq|ne:j64k1b|1
Brockville|brockville||CA|1av|key|9k1x|-g82h|ne:j647lb|1
Broken Hill|broken hill||AU|17q|df7|-6uiz|ubaz|ne:j64m5z|1
Brokopondo|brokopondo||SR|9v|6fo|12w4|-bsjc|ne:j649a7|1
Brookings|brookings||US|1m9|haj|9hvg|-kqtk|ne:j648rx|1
Brooks|brooks||CA|29|axf|au6f|-nzfc|ne:j64gzj|1
Broome|broome||AU|1ve|a76|-3ule|q750|ne:j64m5d|1
Brovary|brovary||UA|v4|1wai|atm7|6li9|ne:j643yl|1
Brownsville|brownsville||US|1q4|3vyv|5k00|-kwbc|ne:j64jut|1
Brownsweg|brownsweg||SR|9v|3ja|12qg|-btp0|ne:j6439j|1
Brownwood|brownwood||US|1q4|g70|6snr|-l7r3|ne:j6421j|1
Brugge|brugge|bruges|BE|9x|350l|az7w|ox8|ne:j64hnt|1
Brumado|brumado||BR|60|wed|-31n8|-8xj0|ne:j647ex|1
Brunswick|brunswick||US|ks|10bx|6ocp|-hgsl|ne:j64jvj|1
Brus Laguna|brus laguna||HN|lr|34z|3dj4|-i3uo|ne:j64a6t|1
Brusque|brusque||BR|1j7|1w4c|-5tc4|-ahjo|ne:j647cf|1
Brussels|brussels|bruxelles brussel|BE|9z|11cwo|aw8x|xf6|ne:j64mzt|1
Bryan|bryan||US|1q4|356s|6kom|-knld|ne:j641y3|1
Bryansk|bryansk|klintsy|RU|a0|95no|beyg|7dnw|ne:j64li3|1
Bu'aale|bu aale|bu ale|SO|rp|15e|8cx|94kp|ne:j63w2b|1
Bua Yai|bua yai||TH|16h|e3h|3c8w|ly9m|ne:j649xj|1
Bubanza|bubanza||BI|a1|9tk|-nsh|6alf|ne:j63zpv|1
Bucaramanga|bucaramanga||CO|1jb|lmjs|1j14|-fo9a|ne:j64jhh|1
Buchanan|buchanan||LR|lw|11a3|19nd|-25kd|ne:j64kjl|1
Buchans|buchans||CA|17t|j1|agoa|-c6sa|ne:j64h7p|1
Bucharest|bucharest||RO|a2|15mgg|9iv5|5ldg|ne:j64mu7|1
Bucheon|bucheon|puch on|KR|mv|ik7k|81cw|r68z|ne:j64isd|1
Budapest|budapest||HU|a4|zziw|a6j0|438e|ne:j64mu1|1
Budaun|budaun||IN|1sy|3gnn|60a4|gy9g|ne:j6472h|1
Buea|buea||CM|1nc|1xig|w26|1z86|ne:j63ymz|1
Buenaventura|buenaventura||CO|1t7|5f2d|tvo|-giix|ne:j64e9l|1
Buenos Aires|buenos aires||AR|e6|7m8oo|-7eza|-cim3|ne:j64n2f|1
Buffalo|buffalo||US|17s|lry8|96vn|-gwnn|ne:j64m9t|1
Bugrino|bugrino||RU|17f|8c|eqxb|akfm|ne:j64c8j|1
Bugt|bugt||CN|17d|dgx|agf2|q4ue|ne:j64f0x|1
Bugulma|bugulma||RU|1pn|1yws|boxz|bbd3|ne:j645kt|1
Buguruslan|buguruslan||RU|1b5|15af|bi2e|b8kq|ne:j645jl|1
Buizhou|buizhou|binzhou|CN|1ke|2hf9|80co|panc|ne:j64evn|1
Bujumbura|bujumbura||BI|a5|73xw|-q1t|6ajk|ne:j64m6z|1
Bukachacha|bukachacha||RU|dn|2lo|bctl|p24u|ne:j64lkt|1
Bukama|bukama||CD|tw|twy|-1z28|5jds|ne:j64fax|1
Bukavu|bukavu||CD|1nb|9d0r|-jd8|66j4|ne:j64kox|1
Bukhara|bukhara||UZ|a6|6uic|8iy0|dt58|ne:j64lcp|1
Bukittinggi|bukittinggi||ID|1nl|av6c|-2c7|lie7|ne:j64dmx|1
Bukoba|bukoba||TZ|sd|25js|-a6k|6tdc|ne:j64apf|1
Bulaevo|bulaevo|bulayev|KZ|192|7mm|brnh|f3io|ne:j64g35|1
Bulandshahr|bulandshahr||IN|1sy|4990|637s|gook|ne:j6472v|1
Bulawayo|bulawayo||ZW|a7|eznd|-4bms|64iw|ne:j64mb3|1
Bulgan|bulgan||MN|a8|ddw|agmi|m6ut|ne:j64jfj|1
Bullhead City|bullhead city||US|48|tb9|7j7e|-ok0b|ne:j648ex|1
Buluko|buluko||CD|18o|x4|-5ua|644g|ne:j63xcl|1
Bulungu|bulungu||CD|6j|11aw|-z3s|3zio|ne:j64f77|1
Bumba|bumba||CD|1xr|3fvf|gwc|4taw|ne:j64mj1|1
Bunbury|bunbury||AU|1ve|kty|-75ab|osd2|ne:j64i8x|1
Bundaberg|bundaberg||AU|1fn|14hk|-5byv|wnjp|ne:j64k6v|1
Bungoma|bungoma||KE|1vd|176i|4eg|7eo0|ne:j64ba7|1
Bunia|bunia||CD|1b8|22nw|c1g|6hc0|ne:j64ejf|1
Buon Me Thuot|buon me thuot|buon ma thuot|VN|fv|7i0p|2pqm|n5pw|ne:j649zd|1
Bur Safaga|bur safaga|safaga|EG|15|pf4|5qa1|79tx|ne:j64eil|1
Bur Said|bur said|port said|EG|aa|dddk|6p7c|6x5g|ne:j64lr3|1
Buraydah|buraydah|buraidah|SA|1w|8jjp|5ng0|9f7w|ne:j64b83|1
Burco|burco|burao|||2a8x|21gk|9re0|ne:j64itb|1
Burdur|burdur||TR|ab|1f1q|830v|6ho1|ne:j63to1|1
Burgas|burgas||BG|ac|477i|941m|5vzu|ne:j64l4t|1
Burgos|burgos||ES|c3|3nbb|92s0|-se8|ne:j649dh|1
Burhanpur|burhanpur||IN|10u|486p|4kcs|gbf8|ne:j64gdl|1
Buriram|buriram|buri ram|TH|ae|10ho|37qs|m3ni|ne:j649xb|1
Burketown|burketown||AU|1fn|5k|-3sp5|twwi|ne:j64im1|1
Burley|burley||US|pq|au2|947i|-oe0v|ne:j6418z|1
Burlington|burlington||US|1to|20dr|9j6e|-fowt|ne:j64lax|1
Burlington|burlington||US|qb|mz1|8qvj|-jj14|ne:j648o5|1
Burnie|burnie||AU|1pl|fes|-8sve|v9wf|ne:j64k75|1
Burns Lake|burns lake||CA|9t|217|bmca|-qyf6|ne:j64h1l|1
Burrel|burrel||AL|gm|bvx|8x6s|4ag0|ne:j63ywh|1
Bursa|bursa||TR|af|vz8g|8m77|68ah|ne:j64ldp|1
Bururi|bururi||BI|ag|fqh|-uhf|6ciu|ne:j64i67|1
Burwash Landing|burwash landing||CA|1wh|21|d5ds|-tsj4|ne:j64h2d|1
Burylbaytal|burylbaytal|burubaytal|KZ|1x6|2s|9mqz|fv7z|ne:j64gab|1
Busan|busan|pusan|KR|ai|22l6o|7it6|rnfl|ne:j64ljz|1
Busia|busia||UG|ak|10cc|3i8|7axi|ne:j63u3d|1
Businga|businga||CD|1xr|qfb|prw|4h18|ne:j64edn|1
Busselton|busselton||AU|1ve|7vq|-77p0|oq1b|ne:j64m57|1
Buta|buta||CD|1b8|z8t|lrc|5aw8|ne:j64knv|1
Butare|butare||RW|1mm|1new|-jzc|6dec|ne:j64avj|1
Butembo|butembo||CD|18o|64zn|104|69xc|ne:j64lup|1
Butha-Buthe|butha buthe||LS|yn|clm|-65u4|61z8|ne:j63wu5|0
Butte|butte||US|14o|qdq|9uyv|-o4be|ne:j64ix5|1
Butterworth|butterworth||MY|1f1|hlzo|15sr|liow|ne:j64bgf|1
Butuan|butuan||PH|r|4319|1x1z|qwp8|ne:j64clf|1
Buur Gaabo|buur gaabo||SO|rq|2e0|-99l|8yxk|ne:j64csv|1
Buurhakaba|buurhakaba|burhakaba|SO|7g|o4j|lh9|9g5d|ne:j64bw3|1
Buy|buy||RU|w5|kfq|cj9r|8wek|ne:j64bzf|1
Buyant-Uhaa|buyant uhaa|sainshand,saynshand|MN|hc|6rs|9m6y|nlx8|ne:j64jev|1
Buynaksk|buynaksk||RU|ft|1mhk|96i7|a3iy|ne:j64cjd|1
Buzău|buzau||RO|an|2t1m|9ofh|5qu9|ne:j644rn|1
Buzmeyin|buzmeyin|abadan etrap|TM|s|vhp|85lx|ch5g|ne:j64447|1
Buzuluk|buzuluk||RU|1b5|1voi|bb9p|b796|ne:j64cch|1
Bydgoszcz|bydgoszcz||PL|wr|7ur8|bdvo|3uys|ne:j64dfl|1
Byron Bay|byron bay||AU|17q|57w|-6545|wxa9|ne:j64ie5|1
Bytom|bytom||PL|1l3|e6zr|asi4|41ws|ne:j6461t|1
Byumba|byumba||RW|19d|1igx|-c6s|6fy0|ne:j64avx|1
Cà Mau|ca mau||VN|fo|7n6k|1yta|mjcc|ne:j64a1p|1
Caacupé|caacupe||PY|ez|gqo|-5fvy|-c8w8|ne:j640ep|1
Caazapá|caazapa||PY|b1|48w|-5m5s|-c314|ne:j644z3|1
Caballococha|caballococha||PE|zn|2gr|-u7v|-f41n|ne:j64b1h|1
Cabanatuan|cabanatuan||PH|19u|4py2|3bm5|pxch|ne:j64ckl|1
Cabimas|cabimas||VE|1rq|9gcm|28h8|-fbb8|ne:j64277|1
Cabinda|cabinda||AO|b4|1ytr|-16wc|2m24|ne:j64hsj|1
Cabo de Santo Agostinho|cabo de santo agostinho||BR|1d4|34tn|-1rys|-7iak|ne:j6482j|1
Cabo Frio|cabo frio||BR|1gm|5ly1|-4wmc|-90ds|ne:j647g1|1
Cabo San Lucas|cabo san lucas||MX|63|wvd|4wn4|-nk11|ne:j64kh3|1
Caboolture|caboolture||AU|1fn|obd|-5sz2|ws64|ne:j64ijt|1
Caborca|caborca|heroica caborca|MX|1lw|1899|6l09|-o1gq|ne:j64cvz|1
Caçador|cacador||BR|1j7|1d66|-5qk4|-axo8|ne:j647d5|1
Čačak|cacak||RS|14v|3n68|9enl|4cv9|ne:j64h9l|1
Cáceres|caceres||BR|136|1tsq|-3fuc|-cbr0|ne:j6478l|1
Cacheu|cacheu||GW|b6|83e|2mo2|-3gqa|ne:j63wg7|1
Cachoeira do Sul|cachoeira do sul||BR|1gl|1lmu|-6fpo|-bc98|ne:j6479p|1
Cachoeiro de Itapemirim|cachoeiro de itapemirim||BR|iy|40az|-4gvo|-8td0|ne:j647ff|1
Cacolo|cacolo||AO|10c|rc|-26bc|44m0|ne:j64hrp|1
Cadillac|cadillac||US|13u|avl|9hg0|-ib20|ne:j649bl|1
Cádiz|cadiz||ES|31|62hh|7twm|-1c16|ne:j64j07|1
Cadiz|cadiz||PH|17c|62hh|2ck3|qfge|ne:j64ck7|1
Caen|caen||FR|77|42oj|aji6|-2p8|ne:j64fmz|1
Cafayate|cafayate||AR|1i5|93d|-5l99|-e502|ne:j64hh1|1
Cagayan de Oro|cagayan de oro||PH|146|o1eh|1t7g|qq2t|ne:j64kgx|1
Cagliari|cagliari||IT|1jn|68xj|8en4|1y8w|ne:j64dql|1
Cahul|cahul||MD|b8|1cxb|9u87|61js|ne:j64bs7|1
Caibarién|caibarien||CU|1u1|u78|4tqe|-h17m|ne:j646f3|1
Caicó|caico||BR|1gk|16dy|-1duc|-7y9k|ne:j64gxt|1
Cairns|cairns||AU|1fn|3b01|-3mb2|v8pt|ne:j64m6j|1
Cairo|cairo|al qahirah|EG|1u|72wp4|6fvr|6p40|ne:j64n3n|1
Cajabamba|cajabamba||PE|b9|aem|-1msk|-gq5s|ne:j64b0d|1
Cajamarca|cajamarca||PE|b9|322x|-1j64|-gtxw|ne:j64k9b|1
Calabar|calabar||NG|fb|9wbo|129w|1s9w|ne:j64d7d|1
Calabozo|calabozo||VE|ms|2ido|1wwo|-egdc|ne:j6499l|1
Calais|calais||FR|18q|1z55|ax4w|e59|ne:j64fq7|1
Calais|calais||US|11d|2ju|9oi4|-eeug|ne:j643az|1
Calama|calama||CL|3d|32ek|-4t84|-ersg|ne:j64kqv|1
Călărași|calarasi||RO|bb|1ki0|9h3j|5uuj|ne:j64axb|1
Calatrava|calatrava||GQ|zb|hg|8m4|20oa|ne:j64ee5|1
Calbayog|calbayog||PH|1ia|1gep|2l40|qpga|ne:j64kgv|1
Calbuco|calbuco||CL|zq|9my|-8y5u|-fod4|ne:j646xx|1
Caldera|caldera||CL|4w|7wz|-5svc|-f6j0|ne:j64frl|1
Caldwell|caldwell||US|pq|2u7w|9cw2|-p08h|ne:j648dn|1
Calgary|calgary||CA|29|nshc|ay69|-og9f|ne:j64mnv|1
Cali|cali||CO|1t7|1cb74|q8z|-geaj|ne:j64mwh|1
Callao|callao||PE|z0|islp|-2l4s|-gj6e|ne:j64j3j|1
Caloundra|caloundra||AU|1fn|tv6|-5qsg|wtl1|ne:j64k6b|1
Calucinga|calucinga||AO|87|er|-2fcc|3h00|ne:j64hsn|1
Calulo|calulo||AO|ff|m3|-255o|36yw|ne:j64hs1|1
Caluula|caluula|aluula|SO|6w|e9|2kc6|avl8|ne:j64civ|1
Cẩm Phả|cam pha||VN|1fl|2wj9|4ick|n034|ne:j649wh|1
Cam Ranh|cam ranh||VN|v0|358z|2ju4|ner3|ne:j64jyx|1
Camabatela|camabatela|ambaca|AO|fe|9wl|-1r6w|3alg|ne:j64hrv|1
Camacupa|camacupa||AO|8m|fas|-2kqs|3qss|ne:j64hst|1
Camagüey|camaguey||CU|bf|7g6i|4kz4|-gp7l|ne:j64jhl|1
Camaná|camana||PE|44|g64|-3k8k|-fl40|ne:j64azh|1
Camaquã|camaqua||BR|1gl|150x|-6lyk|-b3ro|ne:j64gsf|1
Camargo|camargo||BO|e1|3mz|-4f98|-dz5w|ne:j64hbx|1
Cambridge|cambridge||GB|bh|2r54|b6s4|we|ne:j64acn|1
Cambridge|cambridge||NZ|1uq|bq0|-84cu|11lxr|ne:j64n7l|1
Cambridge Bay|cambridge bay||CA|19z|151|etb6|-mifx|ne:j64m1v|1
Cametá|cameta||BR|1ck|yvk|-ha4|-am0s|ne:j64gol|1
Camiri|camiri||BO|1j8|lkp|-4apg|-dm4g|ne:j64k3l|1
Camocim|camocim||BR|ca|ybl|-mdk|-8r78|ne:j647df|1
Camooweal|camooweal||AU|1fn|57|-49of|tlpr|ne:j64k61|1
Campana|campana||AR|e6|1qz0|-7bkw|-cmxs|ne:j647sl|1
Campbell River|campbell river||CA|9t|psm|apxn|-qufo|ne:j64h07|1
Campeche|campeche||MX|bj|4ecc|490c|-jeaw|ne:j64lmd|1
Campina Grande|campina grande||BR|1ci|8xyl|-1jsc|-7ouo|ne:j64k15|1
Campinas|campinas||BR|1o6|1ntjs|-4wol|-a3fw|ne:j64m3l|1
Campo Belo|campo belo||BR|141|10n7|-4h6o|-9pds|ne:j64gqf|1
Campo Grande|campo grande||BR|137|gob4|-4ds1|-bpfu|ne:j64mnf|1
Campo Maior|campo maior||BR|1do|ohn|-116w|-91go|ne:j647e7|1
Campo Murao|campo murao|campo mourao|BR|1ch|1m6h|-55kg|-b8h4|ne:j64gtb|1
Campoalegre|campoalegre||CO|p8|hew|kr8|-g590|ne:j646dd|1
Campobasso|campobasso||IT|14h|1362|8wpa|3534|ne:j63wmb|1
Campos|campos|campos dos goytacazes|BR|1gm|8axl|-4nto|-8uts|ne:j64kyf|1
Camrose|camrose||CA|29|c74|bd2v|-o6hy|ne:j647hv|1
Can Tho|can tho||VN|1xm|o0yw|25jo|mo4k|ne:j64jz5|1
Çanakkale|canakkale||TR|1xo|1vqn|8lrn|5nr4|ne:j64ae5|1
Cananea|cananea||MX|1lw|psp|6n4g|-nn2w|ne:j64cw7|1
Cañas|canas||CR|mc|fo2|28h8|-i8mw|ne:j646c5|1
Canatlan|canatlan|ciudad canatlan|MX|hp|7za|5974|-mghk|ne:j645s5|1
Canavieiras|canavieiras||BR|60|kcn|-3cog|-8cm8|ne:j64ky3|1
Canberra|canberra||AU|58|70us|-7k8u|vyoq|ne:j64mrd|1
Cancún|cancun||MX|1ft|bm8r|4jck|-ilzg|ne:j64mgf|1
Canela|canela||BR|1gl|1ax2|-6ajk|-aw1w|ne:j6479d|1
Canelones|canelones||UY|bk|f76|-7ehw|-c2ag|ne:j63t2f|1
Cangamba|cangamba|cangombe|AO|15a|10b|-2xpg|498o|ne:j64hu5|1
Cangzhou|cangzhou||CN|o3|bb5t|87ok|p1rw|ne:j64esz|1
Canindé|caninde||BR|ca|wyo|-xkc|-8fbg|ne:j647e3|1
Çankırı|cankiri||TR|1xp|1j2r|8pbq|77f6|ne:j63tsx|1
Cankuzo|cankuzo||BI|bn|52x|-ofn|6jgv|ne:j63zo1|1
Canoas|canoas||BR|1gl|cuyo|-6ev4|-aywo|ne:j6478v|1
Canoinhas|canoinhas||BR|1j7|w0q|-5m08|-asw0|ne:j647db|1
Canton|canton||US|1aj|5jl0|8qt1|-hfx6|ne:j64jw7|1
Cantwell|cantwell||US|26|66|dl4s|-vxb8|ne:j643sh|1
Cao Bằng|cao bang||VN|bq|vq0|4uvk|mryw|ne:j63tgl|1
Cao Lãnh|cao lanh||VN|1xu|37m5|28ri|mn3c|ne:j63tf3|1
Cap-Chat|cap chat||CA|1fv|158|aiuw|-eaj5|ne:j647m1|1
Cap-Haïtien|cap haitien||HT|18m|6173|48go|-fh71|ne:j64j23|1
Capanema|capanema||BR|1ck|10uu|-96k|-a41k|ne:j6474t|1
Cape Coast|cape coast||GH|cd|32cn|13fk|-9n8|ne:j64ff1|1
Cape Coral|cape coral||US|jp|2u89|5p9p|-hkk5|ne:j648xt|1
Cape Dorset|cape dorset|kinngait|CA|19z|10u|ds8l|-gekq|ne:j64kzn|1
Cape Girardeau|cape girardeau||US|pu|v6z|7zuq|-j6q5|ne:j642mf|1
Cape Town|cape town||ZA|1vf|1wwpk|-79pp|3y8a|ne:j64n33|1
Capenda-Camulemba|capenda camulemba||AO|10b|1pq8|-20ok|3y7g|ne:j64hrj|1
Capitan Arturo Prat Station|capitan arturo prat station|captain arturo prat base|AQ||15|-de8z|-csip|ne:j64iu3|1
Capitan Pablo Lagerenza|capitan pablo lagerenza|mayor pablo lagerenza|PY|2i|xc|-49o9|-d109|ne:j64b3l|1
Capitão Poço|capitao poco||BR|1ck|p8g|-di0|-a3ck|ne:j64gnd|1
Capitol Hill|capitol hill||MP||1xg|39dd|v8ma|ne:j64isj|1
Caracaraí|caracarai||BR|1gz|8rs|e0i|-d3nx|ne:j64h2h|1
Caracas|caracas||VE|gw|1rz8o|291h|-eccm|ne:j64n0l|1
Carahue|carahue||CL|xd|95v|-8aon|-fol0|ne:j64fsl|1
Caratinga|caratinga||BR|141|1aci|-48p8|-915k|ne:j6476f|1
Carazinho|carazinho||BR|1gl|19uh|-62ac|-bbeo|ne:j647ad|1
Carbondale|carbondale||US|pu|p18|833o|-j4fe|ne:j6492f|1
Cardenas|cardenas||MX|1in|btv|4pr4|-ld24|ne:j645tx|1
Cardiff|cardiff||GB|bz|igns|b1dk|-ovu|ne:j64j2d|1
Carhué|carhue||AR|e6|5jq|-7ywl|-dg1x|ne:j64hdv|1
Carlini Base|carlini base|carlini station,formerly teniente jubany station|AQ||1o|-dc4h|-ckjt|ne:j64iuh|1
Carlisle|carlisle||GB|fg|1k1l|brgg|-mlw|ne:j644ed|1
Carlsbad|carlsbad||US|17p|jiu|6y5q|-mc8b|ne:j64ixt|1
Carmelo|carmelo||UY|ej|d21|-7a9k|-chug|ne:j648af|1
Carnarvon|carnarvon||AU|1ve|5pc|-5c4m|ocxh|ne:j64k4h|1
Carnarvon|carnarvon||ZA|19f|4gp|-6mt4|4qs5|ne:j64bid|1
Carnot|carnot||CF|11m|tdj|122h|3efe|ne:j64dpl|1
Carora|carora||VE|y9|37in|26mk|-f0qo|ne:j6427l|1
Carpina|carpina||BR|1d4|3jrf|-1ohs|-7k2g|ne:j6482n|1
Carson City|carson city||US|17j|188t|8e6u|-po4g|ne:j64ixp|1
Cartagena|cartagena||CO|90|j0ew|289d|-g6or|ne:j64mix|1
Cartagena|cartagena||ES|1gc|4bay|824k|-7k8|ne:j64a8b|1
Cartago|cartago||CR|c0|47yq|245o|-hzlw|ne:j646bp|1
Cartago|cartago||CO|1t7|2w17|10ng|-g9q4|ne:j646dp|1
Cartwright|cartwright||CA|17t|e1|bid2|-c7wp|ne:j64l1l|1
Caruaru|caruaru||BR|1d4|56su|-1rw0|-7pmg|ne:j64l2z|1
Carúpano|carupano||VE|1n6|2pg5|2abw|-djvw|ne:j6438t|1
Casa Grande|casa grande||US|48|ygf|71p6|-nybi|ne:j641bf|1
Casablanca|casablanca|dar el beida|MA|ly|1w6h4|779v|-1ms7|ne:j64n1d|1
Cascavel|cascavel||BR|1ch|5ifo|-5cl8|-bgi0|ne:j64gt3|1
Caserta|caserta||IT|bi|5cwg|8stk|32mm|ne:j6467t|1
Casey Station|casey station||AQ||5k|-e7gt|nowi|ne:j64ivd|1
Casma|casma||PE|30|n5c|-20u8|-grh0|ne:j644ub|1
Casper|casper||US|1vp|1awn|96re|-msb9|ne:j64la1|1
Castanhal|castanhal||BR|1ck|2y0u|-9y8|-a9tw|ne:j64gnh|1
Castello|castello|castello de la plana|ES|ep|3vcy|8kew|-dw|ne:j64auz|1
Castelo Branco|castelo branco||PT|c2|ptz|8j6m|-1ls0|ne:j63vhd|1
Castillos|castillos||UY|1gu|5xi|-7bnk|-bjcs|ne:j648b7|1
Castries|castries||LC||taj|301g|-d2og|ne:j64m75|1
Castro|castro||BR|1ch|wh7|-5ba4|-apvo|ne:j647bv|1
Castro|castro||CL|zq|n3a|-93s8|-ft5j|ne:j646y1|1
Cat Lake|cat lake||CA|1av|7p|b31u|-joc0|ne:j64h3x|1
Catalão|catalao||BR|le|1d14|-3wa0|-a9zg|ne:j647rl|1
Catamarca|catamarca|san fernando del valle de catamarca|AR|c6|41os|-63oc|-e3k8|ne:j64l2d|1
Catanduva|catanduva||BR|1o6|2cks|-4j48|-ahxk|ne:j6481d|1
Catania|catania||IT|1kw|egha|81co|38cw|ne:j64lob|1
Catanzaro|catanzaro||IT|ba|21hv|8c5o|3k34|ne:j64dr7|1
Catió|catio||GW|1r2|7my|2ejr|-390z|ne:j63wi5|1
Cauquenes|cauquenes||CL|139|o76|-7pgw|-fi0w|ne:j646yf|1
Caxias|caxias||BR|12a|2vw0|-11ai|-9aho|ne:j64mn3|1
Caxias do Sul|caxias do sul||BR|1gl|866u|-695k|-aytw|ne:j64m0x|1
Caxito|caxito||AO|7v|ls0|-1u77|2xeg|ne:j64hrt|1
Cayambe|cayambe||EC|1dq|lih|e0|-gr34|ne:j64e4b|1
Cayenne|cayenne||GF|mo|1bhq|122a|-b7s4|ne:j64mkf|0
Cazombo|cazombo||AO|15a|8a|-2jqo|4wp4|ne:j64huh|1
Cebu|cebu|cebu city|PH|cb|hguw|27n7|qk05|ne:j64mf5|1
Cedar City|cedar city||US|1sv|lei|82py|-o8dv|ne:j648mx|1
Cedar Rapids|cedar rapids||US|qb|3nnh|8zuc|-jn94|ne:j64juh|1
Ceduna|ceduna||AU|1m5|182|-6vof|sncf|ne:j64k5n|1
Ceerigaabo|ceerigaabo|erigavo|||3uw0|29nt|a585|ne:j6406h|1
Celaya|celaya|guanajuato|MX|md|8829|4ees|-lls0|ne:j645xd|1
Celeken|celeken|hazar|TM|69|xi|8gai|bdwa|ne:j6443d|1
Central Coast|central coast||AU|17q|2c2|-75vc|wffs|ne:j6487z|1
Centralia|centralia||US|1ux|ekg|a0gs|-qcpm|ne:j641a3|1
Ceres|ceres||BR|le|eh3|-3a2x|-amr8|ne:j647rh|1
Cerrillos|cerrillos||AR|1i5|8ve|-5c4k|-e19t|ne:j64hh5|1
Cerro de Pasco|cerro de pasco||PE|1cl|2xw0|-2ahg|-gci4|ne:j64j3d|1
České Budějovice|ceske budejovice||CZ|rh|249v|ahxk|33ko|ne:j646hh|1
Ceuta|ceuta||ES|ck|1ope|7ox6|-14y6|ne:j64j1x|1
Chabahar|chabahar||IR|1le|1ert|5f7w|cztn|ne:j64g8x|1
Chacabuco|chacabuco||AR|e6|qor|-7fd0|-cyqs|ne:j647sn|1
Chachapoyas|chachapoyas||PE|2q|k1m|-1c2g|-gouk|ne:j64b1d|1
Chachoengsao|chachoengsao||TH|cl|12dp|2xjq|lnwo|ne:j63v51|1
Chadron|chadron||US|17a|4h2|96gn|-m2rz|ne:j648qt|1
Chagda|chagda||RU|1hy|a|cvqg|sp6g|ne:j64jbv|1
Chaghcharan|chaghcharan||AF|l0|bko|7ebz|dzh0|ne:j63z5l|1
Chaguaramas|chaguaramas||VE|3h|bko|201c|-e781|ne:j64993|1
Chainat|chainat|chai nat|TH|cp|bxp|394e|lgks|ne:j63v0j|1
Chaiyaphum|chaiyaphum||TH|cq|190u|3dy0|lvc2|ne:j649xf|1
Chake Chake|chake chake||TZ|wq|12jr|-14ff|8iv8|ne:j64ar5|1
Chalatenango|chalatenango||SV|cr|ml3|30kw|-j3gc|ne:j63wz3|1
Chalkida|chalkida||GR|1mz|1jfm|88sg|5270|ne:j64fv1|1
Challapata|challapata||BO|1ba|716|-41tw|-eba0|ne:j64hvh|1
Chaman|chaman||PK|6d|1wc8|6mma|e8pb|ne:j64j4p|0
Chamdo|chamdo|changdu|CN|1vt|255s|6ohf|ku99|ne:j64jin|1
Chamical|chamical||AR|xj|6xp|-6i6g|-e7pb|ne:j64hgt|1
Champasak|champasak||LA|ct|a0y|36u9|movf|ne:j63y7v|1
Champotón|champoton||MX|bj|kjw|45b4|-jg00|ne:j64czj|1
Chañaral|chanaral||CL|4w|ag7|-5nax|-f4x3|ne:j64kr3|1
Chancay|chancay||PE|z0|ksu|-2h70|-gk7w|ne:j64b37|1
Chandigarh|chandigarh||IN|cu|kzeg|6l1v|ggf9|ne:j64l7l|1
Chandrapur|chandrapur||IN|11a|cr72|4a38|gzvs|ne:j64jph|1
Changchun|changchun||CN|rj|1w80o|9eha|qv44|ne:j64mxt|1
Changde|changde||CN|p9|vhhk|680f|nxpp|ne:j64jk3|1
Changhua|changhua||TW|cv|g2pc|55r2|ptvy|ne:j64iwp|1
Changling|changling|changling county|CN|rj|1735|9hl8|qkpo|ne:j646mb|1
Changping|changping||CN|7m|d6ed|8mdk|owk8|ne:j64dw5|1
Changsha|changsha|changsha hunan|CN|p9|1jt9c|61lv|o7o0|ne:j64mx5|1
Changting|changting||CN|jy|1vhe|5jla|oxi7|ne:j64dwx|1
Changwon|changwon|masan|KR|mw|n6hn|7jr3|rk5o|ne:j644kp|1
Changyon|changyon||KP|pe|11so|875h|qtal|ne:j6464t|1
Changzhi|changzhi||CN|1kg|f4r4|7r73|o8q5|ne:j64eqd|1
Changzhou|changzhou|changzhou jiangsu|CN|re|sfx4|6t8b|ppog|ne:j64jmj|1
Channel-Port aux Basques|channel port aux basques||CA|17t|398|a712|-coek|ne:j64h7l|1
Chanthaburi|chanthaburi||TH|cw|250r|2pbp|lvsj|ne:j649wx|1
Chaoyang|chaoyang||CN|ys|a2vs|8wls|pt60|ne:j64eun|1
Chaozhou|chaozhou||CN|me|93rn|52ps|ozx8|ne:j6469z|1
Chapadinha|chapadinha||BR|12b|vhg|-sur|-9akg|ne:j64gml|1
Chapaev|chapaev||KZ|1v7|4mo|ara3|aymx|ne:j64g1b|1
Chapayevsk|chapayevsk||RU|1ib|2aos|bcr3|anob|ne:j645jp|1
Chapleau|chapleau||CA|1av|21z|a935|-hvio|ne:j64h31|1
Charagua|charagua||BO|1j8|2c1|-48rw|-djt3|ne:j64hxf|1
Charaña|charana||BO|xi|5h|-3rss|-ew0a|ne:j64hup|1
Charata|charata||AR|cm|e49|-5u03|-d480|ne:j64hhx|1
Charikar|charikar||AF|1cj|15f0|7i7b|etpb|ne:j64hq5|1
Charleroi|charleroi||BE|cz|7ehj|at1o|yc4|ne:j64ho1|1
Charleston|charleston||US|1m7|8tus|7110|-h581|ne:j64jvt|1
Charleston|charleston||US|1vb|2niv|87wp|-hhvr|ne:j64lbl|1
Charleville|charleville||AU|1fn|1gs|-5npc|vch0|ne:j64k65|1
Charlotte|charlotte||US|18z|lbqw|7jnp|-hbpc|ne:j64jw3|1
Charlottesville|charlottesville||US|1u5|1vud|85fo|-gtj5|ne:j64jwh|1
Charlottetown|charlottetown||CA|1es|wpu|9wv1|-dj4h|ne:j64moz|1
Charters Towers|charters towers||AU|1fn|7dx|-4ay1|vcjf|ne:j64imt|1
Chascomús|chascomus||AR|e6|g8u|-7mfi|-cfnq|ne:j64hej|1
Chattanooga|chattanooga||US|1q0|5ir9|7ilo|-i9sk|ne:j64jwf|1
Chattogram|chattogram||BD|dp|2p2lk|4sbb|jobg|ne:j64n01|1
Châu Đốc|chau doc||VN|2u|1i73|2akc|mj33|ne:j64a0t|1
Chauk|chauk||MM|115|1y46|4hbx|kbnq|ne:j64irf|1
Cheboksary|cheboksary|ceboksary|RU|e2|9kql|c13o|a4l0|ne:j64j7h|1
Chegdomyn|chegdomyn||RU|un|bgn|ayfe|sif5|ne:j64crl|1
Chegga|chegga||MR|1qm|a|5fu4|-18lk|ne:j64d3x|1
Chelyabinsk|chelyabinsk||RU|d2|ndtk|btld|d61r|ne:j64lix|1
Chelyuskin|chelyuskin||RU|1pq|ol|gno2|mcec|ne:j64cob|1
Chemnitz|chemnitz||DE|1hj|6hir|aw7g|2row|ne:j646hp|1
Chengde|chengde||CN|o3|9mp9|8s1w|p9yc|ne:j64esv|1
Chengdu|chengdu||CN|1kv|2gdbs|6knz|mazt|ne:j64n1p|1
Chennai|chennai||IN|1p2|49j08|2t0n|h7fh|ne:j64myv|1
Chenzhou|chenzhou||CN|p9|6x85|5j2s|o859|ne:j64erh|1
Cheongju|cheongju|ch ungju|KR|e0|gm2g|7uqv|rbt0|ne:j644in|1
Chepes|chepes||AR|xj|4n8|-6pwc|-e9w0|ne:j647w5|1
Cherbourg|cherbourg|cherbourg octeville|FR|77|1b27|an3s|-cqc|ne:j64fmv|1
Cheremkhovo|cheremkhovo||RU|qg|18ab|be6c|m3bn|ne:j64j9b|1
Cherepanovo|cherepanovo||RU|19q|fj1|bmgw|hva0|ne:j64chh|1
Cherepovets|cherepovets||RU|1ub|6omi|cobw|84ik|ne:j64c0j|1
Cherkasy|cherkasy||UA|d3|6dls|alfv|6vgl|ne:j649o7|1
Cherkessk|cherkessk||RU|t7|2hog|9hqw|90jc|ne:j64bvn|1
Cherlak|cherlak||RU|1at|9cq|blwl|g1bc|ne:j64cex|1
Chernihiv|chernihiv||UA|d4|6les|b1ex|6piv|ne:j643wd|1
Chernivtsi|chernivtsi||UA|d5|6e4r|acq5|5k0g|ne:j649nl|1
Chernobyl|chernobyl|chornobyl|UA|v4|0|b0iu|6g8t|ne:j64jyb|1
Chernogorsk|chernogorsk||RU|uo|1j8e|bjd5|jjvn|ne:j645lj|1
Chernyakhovsk|chernyakhovsk||RU|sm|yv7|bpjg|4oal|ne:j645ah|1
Chernyshevsky|chernyshevsky|chernyshevskiy|RU|1hy|3yp|di7k|o3u2|ne:j64jc3|1
Chersky|chersky|cherskiy|RU|1hy|2uz|eqh9|yktw|ne:j64jbl|1
Chester|chester||GB|d6|1x2z|behs|-mj4|ne:j644dl|1
Chesterfield Inlet|chesterfield inlet||CA|19z|ae|dkpz|-jfuh|ne:j64m1z|1
Chetumal|chetumal||MX|1ft|3b85|3yqw|-ixbs|ne:j64jen|1
Chevery|chevery||CA|1fv|7w|atil|-crya|ne:j64h5j|1
Cheyenne|cheyenne||US|1vp|1k9r|8tfs|-mgsl|ne:j64m8t|1
Chiang Mai|chiang mai||TH|d8|8ihn|4128|l7qg|ne:j64len|1
Chiang Rai|chiang rai|chang rai|TH|d9|2idj|49n3|le9l|ne:j649tf|1
Chiayi|chiayi|chiai,chiayi city|TW|dc|apsw|514z|pta7|ne:j64iwt|1
Chibemba|chibemba||AO|p1|15q|-3diw|30n4|ne:j64htn|1
Chibia|chibia||AO|p1|137|-397c|2xms|ne:j64htt|1
Chicago|chicago||US|pu|5coq8|8yrz|-it3k|ne:j64n0j|1
Chiclayo|chiclayo||PE|y1|cshk|-1g6l|-h40u|ne:j64j37|1
Chico|chico||US|bd|21zk|8ijq|-q43g|ne:j64jtz|1
Chicoutimi|chicoutimi||CA|1fv|15mc|adpp|-f8cr|ne:j64l17|1
Chifeng|chifeng||CN|17d|rdc8|9268|pht4|ne:j64ltj|1
Chignik|chignik||US|26|3a|c2dp|-xy8m|ne:j649iv|1
Chihuahua|chihuahua|chihuahua city|MX|dd|gzvs|651h|-mqkl|ne:j64mg1|1
Chilca|chilca||PE|z0|9xw|-2olo|-gg4o|ne:j64b3d|1
Childress|childress||US|1q4|525|7dmh|-lh97|ne:j6423h|1
Chilecito|chilecito||AR|xj|fp3|-691j|-egu0|ne:j64hgn|1
Chililabombwe|chililabombwe||ZM|ew|1rbo|-2ng0|5yns|ne:j64a2z|1
Chillán|chillan||CL|1xz|381o|-7ueo|-fgdg|ne:j64kr7|1
Chilliwack|chilliwack||CA|9t|142u|ajde|-q4z0|ne:j647j3|1
Chilpancingo|chilpancingo|chilpancingo de los bravo|MX|mm|3wqb|3rf0|-lbqw|ne:j645xl|1
Chimaltenango|chimaltenango||GT|de|1rk2|354s|-jgrs|ne:j63xj7|1
Chimbote|chimbote||PE|30|7hxy|-1xzg|-gu90|ne:j64lez|1
Chimboy|chimboy||UZ|t9|shh|979b|ct70|ne:j649r7|1
Chimoio|chimoio||MZ|11w|5i94|-43j4|7698|ne:j64kc5|1
Chinandega|chinandega||NI|di|2z9r|2pgg|-ioas|ne:j64b5b|1
Chincha Alta|chincha alta||PE|po|3a44|-2vjo|-gbi0|ne:j64b2h|1
Chingola|chingola||ZM|ew|3wfz|-2or8|5yw4|ne:j64a2v|1
Chinhoyi|chinhoyi||ZW|12v|1bmz|-3py4|6gvc|ne:j64a65|1
Chiniot|chiniot||PK|1f3|4bp1|6sr4|fn48|ne:j6455d|1
Chinsali|chinsali||ZM|19d|atb|-29eg|6vdk|ne:j64a2d|1
Chipata|chipata||ZM|i2|1ubv|-2x60|6zuo|ne:j64a3d|1
Chiquimula|chiquimula||GT|dj|w1d|366a|-j6xc|ne:j63xm3|1
Chiquinquirá|chiquinquira||CO|9g|15nb|17d8|-ftlj|ne:j64e55|1
Chiradzulu|chiradzulu||MW|dk|17w|-3d54|7jh5|ne:j63xfl|1
Chirala|chirala||IN|33|5f7s|3edo|h7wo|ne:j64fip|1
Chiramba|chiramba||MZ|1lm|fg|-3mc9|7fen|ne:j64bsz|1
Chirchiq|chirchiq||UZ|1pk|3lia|8vva|ewq8|ne:j64481|1
Chiredzi|chiredzi||ZW|12z|lrh|-4if4|6sag|ne:j64a5p|1
Chiromo|chiromo||MW|19r|jgz|-3jp8|7j38|ne:j64kpd|1
Chișinău|chisinau||MD|dm|eqyu|a2oy|66o1|ne:j64mdx|1
Chistopol|chistopol|cistay|RU|1pn|1bzs|bv74|auqv|ne:j64cdp|1
Chita|chita||RU|dn|6m1g|b5nq|obi2|ne:j64mfl|1
Chitado|chitado||AO|fi|dw|-3pn0|2zeo|ne:j64htj|0
Chitipa|chitipa||MW|do|ack|-22yy|74oq|ne:j64bsh|1
Chitré|chitre||PA|oa|y0i|1phw|-h8iw|ne:j64581|1
Chitungwiza|chitungwiza||ZW|nn|7amg|-3uw0|6nyw|ne:j64ldf|1
Chivilcoy|chivilcoy||AR|e6|162a|-7hag|-cv9s|ne:j647t1|1
Chlef|chlef||DZ|dq|9mkv|7r3c|a6o|ne:j64i01|1
Choele Choel|choele choel||AR|1fx|7ps|-8eze|-e2td|ne:j647un|1
Choibalsan|choibalsan|choybalsan|MN|hb|pr4|aavu|ojj8|ne:j64lnd|1
Chokurdakh|chokurdakh||RU|1hy|1xm|f4w7|vp5u|ne:j64ll1|1
Cholpon Ata|cholpon ata||KG|1wf|ecj|953l|girf|ne:j64565|1
Choluteca|choluteca||HN|dt|24px|2umn|-ioro|ne:j64a7b|1
Choma|choma||ZM|1mm|102i|-3lpb|5s3o|ne:j64a3v|1
Chon Buri|chon buri||TH|du|4uuy|2vec|lnbk|ne:j649wt|1
Chonchi|chonchi||CL|zq|al|-94s4|-ftir|ne:j646y5|1
Chone|chone||EC|11o|yj3|-5bk|-h5z8|ne:j64e3t|1
Chongjin|chongjin|ch ongjin|KP|nk|eezq|8yeu|rtgs|ne:j64jez|1
Chongju|chongju||KP|1bz|31e1|8i6l|qu6b|ne:j64dj7|1
Chongqing|chongqing||CN|dv|3uhc8|6c51|muh6|ne:j64mvz|1
Chos Malal|chos malal||AR|17h|6lo|-80g6|-f26i|ne:j64hbd|1
Chosan|chosan||KP|cn|60a|8r0f|qyoo|ne:j6465j|1
Chosica|chosica||PE|z0|1wda|-2k1w|-gfwc|ne:j644vl|1
Chota|chota||PE|b9|azk|-1ejc|-guv8|ne:j64b0l|1
Christchurch|christchurch||NZ|bp|7s8w|-9bx2|1100s|ne:j64n6d|1
Christiansted|christiansted||VI||p3z|3syo|-dvm4|ne:j64isl|1
Chukai|chukai||MY|1rk|1rll|wnw|m67j|ne:j64bhf|1
Chulucanas|chulucanas||PE|1dv|1h43|-139s|-h6lg|ne:j64az1|1
Chumbicha|chumbicha||AR|c6|1zg|-66qi|-e725|ne:j647vj|1
Chumikan|chumikan||RU|un|109|bq5m|t03d|ne:j64jd1|1
Chumphon|chumphon||TH|dz|1u46|2947|l9c0|ne:j649sx|1
Chuncheon|chuncheon|ch unch on|KR|kf|4urx|848r|rdlq|ne:j644jb|1
Chuquicamata|chuquicamata||CL|3d|0|-4s80|-erv8|ne:j646up|1
Chur|chur||CH|m3|tjp|a1hw|21aw|ne:j643k1|1
Churchill|churchill||CA|121|rs|clfw|-k6l8|ne:j64mnn|1
Churchill Falls|churchill falls||CA|17t|2s|bh0g|-dpof|ne:j64h7z|1
Chusovoy|chusovoy||RU|1d3|1jn5|chsm|ce37|ne:j64dgx|1
Chuxiong|chuxiong|chuxiong city|CN|1wj|5g9u|5d6k|lrj4|ne:j646kf|1
Ciego de Ávila|ciego de avila||CU|e3|31l7|4oio|-gvqb|ne:j646cp|1
Ciénaga|cienaga||CO|114|2t7n|2cyg|-fwx0|ne:j64eal|1
Cienfuegos|cienfuegos||CU|e4|400k|4qv8|-h8oj|ne:j64e5z|1
Cilacap|cilacap||ID|r5|p6lw|-1nk4|nd62|ne:j64dz3|1
Cincinnati|cincinnati||US|1aj|z2cg|8e6u|-i3ot|ne:j64m9h|1
Circle|circle||US|26|2s|e3wz|-uvkt|ne:j649kj|1
Cirebon|cirebon||ID|r4|5g7u|-1fyd|n9pe|ne:j64klx|1
Ciudad Altamirano|ciudad altamirano||MX|mm|ixh|3xd0|-lkmc|ne:j64d1f|1
Ciudad Bolívar|ciudad bolivar||VE|90|78sw|1qi0|-dmqo|ne:j64jwx|1
Ciudad Camargo|ciudad camargo|santa rosalia de camargo|MX|dd|t4f|5xns|-mjhx|ne:j64cuh|1
Ciudad Constitución|ciudad constitucion||MX|63|usr|5d7k|-nxko|ne:j645r3|1
Ciudad Cortés|ciudad cortes||CR|1f4|2yy|1x50|-hwis|ne:j64e6l|1
Ciudad del Carmen|ciudad del carmen||MX|bj|3cir|3zxl|-joit|ne:j64czf|1
Ciudad del Este|ciudad del este||PY|2j|6vl4|-5gvz|-bpf5|ne:j64lf7|1
Ciudad Guayana|ciudad guayana||VE|90|g013|1sl0|-df6g|ne:j64m9x|1
Ciudad Guzman|ciudad guzman||MX|qz|1z41|4834|-m6aw|ne:j64cy5|1
Ciudad Hidalgo|ciudad hidalgo||MX|13v|1di2|47uo|-lk04|ne:j645v5|1
Ciudad Juárez|ciudad juarez||MX|dd|ss9k|6sjf|-mtp4|ne:j64jdx|1
Ciudad Madero|ciudad madero||MX|1oz|44ps|4s7p|-kywp|ne:j645ux|1
Ciudad Mante|ciudad mante||MX|1oz|1ppp|4veu|-l7i4|ne:j645uj|1
Ciudad Obregon|ciudad obregon||MX|1lw|6682|5vxm|-nk6q|ne:j64cvp|1
Ciudad Valles|ciudad valles||MX|1in|2gpg|4plk|-l81k|ne:j645u3|1
Ciudad Victoria|ciudad victoria||MX|1oz|5w44|530w|-l8w4|ne:j64je5|1
Civitavecchia|civitavecchia||IT|yf|1bb8|90uk|2j1s|ne:j64dsv|1
Clare|clare||AU|1m5|2d1|-7921|tpg0|ne:j64ien|1
Clarksburg|clarksburg||US|1vb|m79|8f41|-h7vt|ne:j6431j|1
Clarksville|clarksville||US|1q0|2u9k|7tv9|-iq2i|ne:j64945|1
Cleburne|cleburne||US|1q4|rfd|6xmj|-kvhh|ne:j64213|1
Clermont-Ferrand|clermont ferrand||FR|5a|4ztm|9t8o|nrk|ne:j646tx|1
Cleveland|cleveland||US|1aj|14ic0|8vzz|-hidl|ne:j64m9f|1
Cliza|cliza||BO|ed|c7c|-3rq4|-e4pw|ne:j647qh|1
Cloncurry|cloncurry||AU|1fn|xe|-4fq0|u43s|ne:j64k6p|1
Clovis|clovis||US|17p|q2o|7dgz|-m4c0|ne:j648kf|1
Cluj-Napoca|cluj napoca||RO|ea|6sek|a10s|5234|ne:j64k8h|1
Coalcoman|coalcoman|coalcoman de vazquez pallares|MX|13v|89n|40ws|-m3ws|ne:j64cyn|1
Coari|coari||BR|2q|154p|-vhc|-dj44|ne:j64kvx|1
Coatzacoalcos|coatzacoalcos||MX|1tm|65o5|3vtg|-k8js|ne:j64d25|1
Cobalt|cobalt||CA|1av|124|a5m5|-h2u9|ne:j64h4n|1
Cobán|coban||GT|2g|1eay|3bd8|-jddk|ne:j646qd|1
Cobija|cobija||BO|9|yad|-2d19|-eqmg|ne:j64kvf|0
Cobram|cobram||AU|1tx|3lf|-7p5o|v7uc|ne:j64iin|1
Coburg|coburg||DE|7k|1b3y|aruy|2cma|ne:j646h3|1
Cochabamba|cochabamba||BO|ed|lfls|-3qc4|-e6kk|ne:j64k2p|1
Cochrane|cochrane||CA|1av|3fd|ailq|-hd4m|ne:j64h4t|1
Cochrane|cochrane||CL|v|3fd|-a4pj|-fjsr|ne:j64fqv|1
Codó|codo||BR|12b|1s9k|-ykc|-9ekw|ne:j64gmd|1
Cody|cody||US|1vp|72h|9jjk|-ndhn|ne:j64juf|1
Coeur d'Alene|coeur d alene||US|pq|qmq|a7vx|-p12q|ne:j648dx|1
Coffeyville|coffeyville||US|t2|92o|7xsd|-khuv|ne:j648pf|1
Coffs Harbour|coffs harbour||AU|17q|1cle|-6hun|wtf7|ne:j64idb|1
Coihaique|coihaique|coyhaique|CL|w|zbv|-9rmc|-fg3g|ne:j64lwd|1
Coimbatore|coimbatore||IN|1p2|10cn4|2cw3|ghqh|ne:j64mml|1
Coimbra|coimbra||PT|ef|2a8m|8m6s|-1sxz|ne:j64b63|1
Cojutepeque|cojutepeque||SV|fj|11cr|2xu7|-j27p|ne:j63wvx|1
Colac|colac||AU|1tx|70h|-87tv|urvc|ne:j64igx|1
Cold Bay|cold bay||US|26|5k|btxc|-yvin|ne:j64ma5|1
Colesberg|colesberg||ZA|19f|9l3|-6l17|5do8|ne:j64bi3|1
Colíder|colider||BR|136|kxv|-2bgt|-bvuy|ne:j64m0n|1
Colima|colima||MX|eh|4saf|44do|-m8b4|ne:j64lmb|1
Colinas|colinas||BR|12b|jeu|-1aln|-9hcw|ne:j64gn3|1
Collipulli|collipulli||CL|xd|cnc|-84wg|-fivg|ne:j646wj|1
Cologne|cologne|koln|DE|18u|liow|awzs|1hm1|ne:j64ko3|1
Colombo|colombo||LK|ei|4nfs|1hhk|h46q|ne:j64mf3|1
Colón|colon|bucaramanga|PA|el|4deo|209e|-h4bi|ne:j64j5j|1
Colón|colon||CU|134|1dai|4vb0|-hc9u|ne:j64ec7|1
Colonia del Sacramento|colonia del sacramento||UY|ej|gr6|-7e1s|-ceao|ne:j63t11|1
Colorado Springs|colorado springs||US|ek|akwm|8bva|-mgkw|ne:j64l9p|1
Columbia|columbia||US|14a|8j65|8ck1|-jsgb|ne:j648px|1
Columbia|columbia||US|1m7|8j65|7ank|-hc88|ne:j64lbb|1
Columbia|columbia||US|1q0|2hkr|7mt2|-inkh|ne:j642vt|1
Columbus|columbus|columbus ohio|US|1aj|r7xs|8ki3|-hsdc|ne:j64jwd|1
Columbus|columbus||US|ks|4o70|6yjk|-i7pk|ne:j648zj|1
Comallo|comallo||AR|1fx|kl|-8sm5|-f26i|ne:j647ub|1
Comandante Fontana|comandante fontana||AR|jq|3at|-5fh1|-csip|ne:j647xf|1
Comayagua|comayagua||HN|em|1iw6|33ks|-isb8|ne:j64a75|1
Combarbalá|combarbala||CL|ey|3ym|-6ol4|-f7u8|ne:j646v3|1
Comendador|comendador||DO|ik|xva|41nc|-fdam|ne:j63xpz|0
Comilla|comilla|cumilla|BD|dp|8cgz|513k|jjh0|ne:j64i4n|1
Como|como||IT|zj|5cwg|9th0|1y28|ne:j6468z|1
Comodoro Rivadavia|comodoro rivadavia||AR|dx|30oi|-9txo|-egu0|ne:j64mpf|1
Comondante Luis Piedrabuena|comondante luis piedrabuena|comandante luis piedrabuena|AR|1j8|be|-aplt|-ernv|ne:j647p3|1
Compostela|compostela||MX|176|cgy|4jtc|-mhew|ne:j64cz5|1
Conakry|conakry||GN|er|w0s0|21k7|-2xkm|ne:j64mmt|1
Conceição do Araguaia|conceicao do araguaia||BR|1ck|kx7|-1rno|-akbo|ne:j64kwp|1
Concepción|concepcion||CL|ay|j2il|-7w6k|-fnno|ne:j64ml3|1
Concepción|concepcion||PY|es|19m6|-50ls|-cb60|ne:j64j3l|1
Concepción del Uruguay|concepcion del uruguay||AR|in|1gdz|-6ym8|-chds|ne:j647xx|1
Concord|concord||US|17m|yf2|99e9|-fbzo|ne:j64jv1|1
Concordia|concordia||AR|in|341m|-6q7c|-cfrg|ne:j64hid|1
Concórdia|concordia||BR|1j7|16pz|-5u3w|-b5gs|ne:j647c5|1
Concordia Research Station|concordia research station|concordia station|AQ||u|-g04n|qm2u|ne:j64ivb|1
Conroe|conroe||US|1q4|w4r|6hw1|-kgjj|ne:j648sn|1
Conselheiro Lafaiete|conselheiro lafaiete||BR|141|2e3w|-4fho|-9dvw|ne:j6477l|1
Constanța|constanta||RO|eu|6i3r|9h2j|64r8|ne:j64led|1
Constantine|constantine||DZ|ev|cyyj|7sk0|1exb|ne:j64m4t|1
Constitución|constitucion||CL|139|t99|-7kls|-fiso|ne:j64ft7|1
Contamana|contamana||PE|zn|ell|-1kmw|-g2uw|ne:j64k9l|1
Conway|conway||US|49|1bu3|7irl|-jtcx|ne:j648nv|1
Cooma|cooma||AU|17q|514|-7rmk|vym8|ne:j64iap|1
Coos Bay|coos bay||US|1b3|oo8|9ama|-qmgm|ne:j64jub|1
Copiapó|copiapo||CL|4w|2rr4|-5v40|-f2qw|ne:j64lwh|1
Coquimbo|coquimbo|atletico morelia|CL|ey|3gh1|-6f49|-faho|ne:j64frp|1
Coracora|coracora||PE|5c|5q4|-37w4|-ftd8|ne:j64b2d|1
Coral Gables|coral gables||US|jp|37qo|5if6|-h7j3|ne:j648xn|1
Coral Harbour|coral harbour||CA|19z|n6|dr0i|-htsm|ne:j64h1v|1
Coral Springs|coral springs||US|jp|5cwg|5mpg|-h7dg|ne:j642ej|1
Córdoba|cordoba||AR|fp|v4dc|-6q9o|-dr8y|ne:j64mpt|1
Córdoba|cordoba||ES|31|6vz4|84a8|-10t0|ne:j64le5|1
Córdoba|cordoba||MX|1tm|4q6r|41zo|-kru8|ne:j64d2f|1
Cordova|cordova||US|26|1qp|cz5g|-v8o7|ne:j64jy1|1
Cork|cork||IE|f0|41rf|b4ga|-1tjy|ne:j64jg5|1
Corner Brook|corner brook||CA|17t|g1j|ahp8|-cf0l|ne:j64k2d|1
Cornwall|cornwall||CA|1av|11o5|9ncr|-g0n9|ne:j64h41|1
Coro|coro||VE|j9|46mz|2g48|-exnk|ne:j64jux|1
Coro Coro|coro coro|corocoro|BO|xi|1gc|-3ohc|-eo5w|ne:j64hv7|1
Coroatá|coroata||BR|12b|qc1|-vv4|-9gnw|ne:j64gmh|1
Coroico|coroico||BO|xi|1tl|-3gx4|-eij4|ne:j64hv3|1
Coronel|coronel||CL|ay|1zpo|-7xq3|-foi8|ne:j646wx|1
Coronel Bogado|coronel bogado||PY|qo|b15|-5tn8|-c210|ne:j644zn|1
Coronel Oviedo|coronel oviedo||PY|b0|1vz9|-5gdg|-c3hs|ne:j644yx|1
Coronel Suárez|coronel suarez||AR|e6|ku0|-813e|-d9r2|ne:j647tt|1
Çorovodë|corovode||AL|80|au6|8omn|4c4d|ne:j63yt3|1
Corozal|corozal|corozal town|BZ|f3|6qc|3xyk|-iy08|ne:j640t1|1
Corpus Christi|corpus christi||US|1q4|5y32|5y2c|-kvk3|ne:j64laj|1
Corrientes|corrientes||AR|f4|7azb|-5w44|-cls4|ne:j647xt|1
Corriverton|corriverton||GY|117|99c|19iw|-c94k|ne:j64493|1
Corum|corum||TR|1xq|3xiy|8onk|7hoc|ne:j644hf|1
Corumbá|corumba||BR|137|22h4|-42q8|-cctw|ne:j64m0f|1
Corvallis|corvallis||US|1b3|19jq|9jx8|-qf8g|ne:j648lt|1
Cotabato|cotabato|cotabato city|PH|1kh|5zof|1jop|qmpg|ne:j64kgt|1
Cotonou|cotonou||BJ|1bv|gbyo|1dec|jfg|ne:j64mqt|1
Cottbus|cottbus||DE|9l|292j|b3go|32kk|ne:j64enz|1
Cottica|cottica||SR|1lb|mje|tpg|-bmgt|ne:j64le3|1
Cotuí|cotui||DO|1o5|w4p|4326|-f1ao|ne:j63x5d|1
Council Bluffs|council bluffs||US|qb|26jx|8udr|-kjo0|ne:j648on|1
Courtenay|courtenay||CA|9t|pax|ancx|-qsi8|ne:j64k1l|1
Coventry|coventry||GB|1v8|8blb|b8h8|-bko|ne:j64acb|1
Covilhã|covilha||PT|c2|j5o|8mtt|-1lvc|ne:j6450l|1
Covington|covington||US|uf|cjrl|8dko|-i42m|ne:j6492v|1
Cowell|cowell||AU|1m5|ex|-77wd|tcge|ne:j64ifn|1
Cowra|cowra||AU|17q|58r|-7914|vv80|ne:j64ib7|1
Cozumel|cozumel|san miguel de cozumel|MX|1ft|1l1q|4e98|-imws|ne:j64khb|1
Cradock|cradock||ZA|i3|pdu|-6wgb|5hlw|ne:j64bu5|1
Craig|craig||US|ek|78v|8omt|-n1v4|ne:j648jt|1
Craiova|craiova||RO|h7|6ioe|9i0v|53ub|ne:j64ax5|1
Cranbourne|cranbourne||AU|1tx|9vbf|-85z8|v50i|ne:j64ii1|1
Cranbrook|cranbrook||CA|9t|ecy|am2n|-ot9f|ne:j647iv|1
Crateús|crateus||BR|ca|14ud|-13uw|-8ps4|ne:j64gux|1
Crato|crato||BR|ca|5vbv|-1js8|-8g60|ne:j64gub|1
Crato|crato||BR|2q|5vbv|-1llb|-dif4|ne:j64kwb|1
Crescent City|crescent city||US|bd|8we|8y71|-qmc5|ne:j648ip|1
Creston|creston||CA|9t|3ps|aiuw|-oz1r|ne:j647ip|1
Crestview|crestview||US|jp|hab|6lau|-ijzy|ne:j642hd|1
Criciúma|criciuma||BR|1j7|4dkp|-65ao|-al3g|ne:j64kxl|1
Cristalina|cristalina||BR|le|s6r|-3lec|-a7d0|ne:j647rp|1
Crookston|crookston||US|142|6od|a8mi|-kpfh|ne:j6416d|1
Crotone|crotone||IT|ba|1aay|8dkh|3o4h|ne:j6467f|1
Cruzeiro do Sul|cruzeiro do sul||BR|9|17vi|-1mvg|-fkq4|ne:j64mmx|1
Cuamba|cuamba||MZ|171|1kj8|-3648|7ty0|ne:j64bl1|1
Cuangar|cuangar||NA|tz|dw|-3rvj|3zo8|ne:j64dkz|1
Cuauhtémoc|cuauhtemoc||MX|dd|1y37|63c1|-mwm0|ne:j64cu5|1
Cubal|cubal||AO|7w|3qd|-2sm4|31vk|ne:j64hsx|1
Cúcuta|cucuta||CO|18x|fh7m|1p40|-fjkg|ne:j64ji1|1
Cuddalore|cuddalore||IN|1p2|3ecp|2ifo|h3ic|ne:j64geh|1
Cuenca|cuenca||EC|5i|65cu|-mdk|-gxkg|ne:j64lqd|1
Cuencame|cuencame||MX|hp|6uk|5bwg|-m85k|ne:j64cul|1
Cuernavaca|cuernavaca||MX|150|hvip|41zv|-l9qo|ne:j64jeh|1
Cuevo|cuevo||BO|1j8|qh|-4dsk|-dm78|ne:j64867|1
Cuiabá|cuiaba||BR|136|h9ww|-3c4d|-c0rp|ne:j64m0t|1
Cuilapa|cuilapa||GT|1ja|cpw|326e|-jcqs|ne:j63xlp|1
Cuito Caunavale|cuito caunavale|cuito cuanavale|AO|fd|45|-38z0|43x0|ne:j64ht5|1
Culiacán|culiacan||MX|1l5|hc88|5blr|-n0kb|ne:j64llv|1
Cumaná|cumana||VE|1n6|6t2b|28ms|-dr7s|ne:j64j03|1
Cumberland|cumberland||US|12o|gg4|8hys|-gvqk|ne:j6496p|1
Curanilahue|curanilahue||CL|ay|nmb|-8174|-fpw8|ne:j646xb|1
Curepipe|curepipe||MU||6fgn|-4cre|cbsu|ne:j64itn|1
Curicó|curico||CL|139|2fqn|-7hwo|-f9ow|ne:j64krj|1
Curitiba|curitiba||BR|1ch|1u3mo|-5g4l|-akkj|ne:j64mzd|1
Curvelo|curvelo||BR|141|1dci|-40r0|-9ito|ne:j64gqn|1
Cusco|cusco|cuzco|PE|fk|7qou|-2wcy|-ffca|ne:j64mc3|1
Cutral Có|cutral co||AR|17i|10w6|-8cgo|-eu9c|ne:j647q7|1
Cuttack|cuttack|pochinki|IN|1b9|cfj4|4dy4|ieqb|ne:j64lvf|1
Cuya|cuya||CL|1pc|k|-43i7|-f15h|ne:j646ul|1
Cyangugu|cyangugu||RW|1vd|fcs|-j4s|66zs|ne:j64avt|0
Da Lat|da lat||VN|10h|5hjn|2k20|n8ko|ne:j649zj|1
Da Nang|da nang||VN|1xw|lfls|3fx4|n79g|ne:j64ld3|1
Daan|daan|da an|CN|rj|1zzl|9r2w|qn3s|ne:j646m5|1
Dabola|dabola||GN|jb|a2p|2axk|-2dpu|ne:j63yjh|1
Dabou|dabou||CI|xx|1k9d|151w|-xvf|ne:j64gkv|1
Daegu|daegu|taegu|KR|1om|1gq5c|7orj|rkbm|ne:j64j8n|1
Daejeon|daejeon|daejon,taejon|KR|fs|vgps|7sdr|rb7b|ne:j64ljv|1
Dagupan|dagupan||PH|1ca|3iak|3ftr|psk0|ne:j64ckp|1
Dajabón|dajabon||DO|fu|cni|46u0|-fda2|ne:j63xnz|0
Dakar|dakar||SN|fw|1jt9c|35ka|-3qu7|ne:j64n15|1
Dalaba|dalaba||GN|11n|4wd|2a80|-2mow|ne:j63yep|1
Dalandzadgad|dalandzadgad|dalanzadgad|MN|1y0|bn9|9cak|mdv7|ne:j64ln3|1
Dalby|dalby||AU|1fn|7lj|-5ttv|wf69|ne:j64ik5|1
Dalhart|dalhart||US|1q4|5gw|7q8w|-lz1e|ne:j64241|1
Dali|dali||CN|1wj|3cwd|5iaw|lgzs|ne:j64jkt|1
Dali|dali||CN|1k8|2cn4|7ghd|nkaa|ne:j646j5|1
Dalian|dalian||CN|ys|1vvo8|8ccg|q2hj|ne:j64lsp|1
Dallas|dallas|dallas fort worth|US|1q4|2uu5s|7198|-kr8k|ne:j64mtf|1
Dalnegorsk|dalnegorsk||RU|1eq|69n|9jng|t1no|ne:j64lkv|1
Dalnerechensk|dalnerechensk||RU|1eq|lu4|9udl|snt3|ne:j645oz|1
Daloa|daloa||CI|ny|5gw0|1h5w|-1dro|ne:j64kvb|1
Dalton|dalton||US|ks|196l|7ga9|-i7mv|ne:j642i5|1
Daman|daman||IN|fq|unt|4dje|fm44|ne:j64gfl|1
Damanhûr|damanhur||EG|18|apsw|6nl4|6j3w|ne:j64egn|1
Damascus|damascus|dimashq|SY|fz|1gus0|76i4|7s2t|ne:j64mud|1
Damaturu|damaturu||NG|1wa|5hg7|2inm|2kbw|ne:j640ix|1
Dammam|dammam|ad dammam,ad damman|SA|4k|181fa|5nxp|aqk1|ne:j64bd1|1
Dandeldhura|dandeldhura|dadeldhura|NP|119|eo6|6a2w|h9ww|ne:j63vsx|1
Dandong|dandong||CN|ys|inao|8lrk|qnt8|ne:j64jln|1
Dangriga|dangriga|stann creek town|BZ|1mv|8am|3mxw|-iwpk|ne:j6482x|1
Danjiangkou|danjiangkou||CN|p6|1yzs|6yxc|nwc8|ne:j646jj|1
Danville|danville||US|1u5|zeu|7uav|-h0m9|ne:j6494t|1
Daqing|daqing||CN|o5|10abs|9zff|qshp|ne:j64ltv|1
Dar'a|dar a|daraa|SY|g1|350x|6zqi|7ql6|ne:j63uet|1
Dar es Salaam|dar es salaam||TZ|g0|1qssw|-1ggd|8ezc|ne:j64mvd|1
Darkhan|darkhan|darhan|MN|1jz|1lo2|amuf|mslo|ne:j64jfn|1
Darnah|darnah|derna|LY|1x|2qqu|70tc|4uon|ne:j64ksl|1
Darregueira|darregueira||AR|e6|2ms|-82w4|-djea|ne:j64hdz|1
Daru|daru||PG||bqm|-1yac|up75|ne:j6407f|1
Darwin|darwin||AU|19i|1ztk|-2nvi|s1n8|ne:j64mr7|1
Daşoguz|dasoguz|dashkhovuz|TM|1pj|4bf4|8yu8|cuoy|ne:j64jyl|1
Datong|datong|datong shanxi|CN|1kg|1457s|8l9w|oa7p|ne:j64jjj|1
Daugavpils|daugavpils||LV|g3|2e30|bz68|5ojw|ne:j64kk3|1
Dauphin|dauphin||CA|121|705|ayoc|-lfzn|ne:j64kyp|1
Davangere|davangere||IN|th|asjw|33ng|g9sw|ne:j64kq5|1
Davao|davao|davao city|PH|g4|u1sg|1ivk|qxcp|ne:j64mfb|1
Davenport|davenport||US|qb|5hbu|8wms|-jez7|ne:j648o1|1
David|david||PA|dl|2cwl|1t2l|-ho25|ne:j64lhd|1
Davis Station|davis station||AQ||1y|-eqox|gqxr|ne:j64iv7|1
Dawei|dawei|tavoy|MM|1p6|34tg|30s4|l1oe|ne:j64irt|1
Dawmat al Jandal|dawmat al jandal||SA|1k|hfb|6e21|8jm0|ne:j6450z|1
Dawra|dawra|daora,daoura|MA|xo|a|5vwl|-2s8y|ne:j64dlb|1
Dawson City|dawson city|dawson|CA|1wh|10n|dqca|-tvqv|ne:j64m27|1
Dawson Creek|dawson creek||CA|9t|8c2|byau|-prq5|ne:j64h0v|1
Dayr az Zawr|dayr az zawr|deir ez zor|SY|g6|6mj9|7km0|8ln8|ne:j649gb|1
Dayton|dayton||US|1aj|gkg8|8iqb|-i1pf|ne:j64izp|1
Daytona Beach|daytona beach||US|jp|4ncq|69e2|-hd6f|ne:j64jvd|1
De Aar|de aar||ZA|19f|oxq|-6khw|556o|ne:j64kbp|1
De-Kastri|de kastri||RU|un|2sf|b14a|u6ah|ne:j64jcz|1
Dease Lake|dease lake||CA|9t|8f|cj07|-rvcd|ne:j64h1p|1
Debre Birhan|debre birhan|debre berhan|ET|2r|1ebz|22p0|8h0k|ne:j64fx3|1
Debre Markos|debre markos|debre marqos|ET|2r|1ili|27s8|831s|ne:j64ksx|1
Debrecen|debrecen||HU|nd|4ygm|a6qx|4mwc|ne:j64anj|1
Decatur|decatur||US|pu|1o30|8jev|-j2dn|ne:j6491h|1
Dédougou|dedougou||BF|158|yzh|2o3q|-qq8|ne:j63zt5|1
Dedza|dedza||MW|g9|c1k|-32ur|7cx1|ne:j63xe7|1
Deer Lake|deer lake||CA|17t|37n|ajfk|-cb3x|ne:j647nz|1
Deer Lake|deer lake||CA|1av|2vz|b9zu|-k5tm|ne:j64h3t|1
Dehibat|dehibat|dehiba|TN|1pm|2px|6v1n|2ak8|ne:j649e7|1
Dehra Dun|dehra dun|dehradun|IN|1t0|fb3j|6hyc|gq8k|ne:j64gc5|1
Del Rio|del rio||US|1q4|rtw|6akd|-lmis|ne:j648tv|1
Delano|delano||US|bd|yj9|7nxv|-pk33|ne:j641f3|1
Delémont|delemont||CH|ru|8qb|a5ic|1koa|ne:j63ufd|1
Delhi|delhi||IN|gb|9hckw|658f|gjw9|ne:j64my5|1
Delicias|delicias||MX|dd|2gkf|61lc|-mm1k|ne:j64jdz|1
Demba|demba||CD|tl|h6f|-16ig|4rrc|ne:j64f87|1
Dembi Dolo|dembi dolo|dembi dollo|ET|g|lfo|1tuh|7gio|ne:j64fyl|1
Deming|deming||US|17p|ckq|6wxf|-n3g6|ne:j641i5|1
Denali Park|denali park||US|26|1eq|dnrn|-vx11|ne:j649kn|1
Dengzhou|dengzhou||CN|o6|19sa|705w|o0tc|ne:j64euf|1
Deniliquin|deniliquin||AU|17q|66w|-7m5c|v2fw|ne:j64ia7|1
Denizli|denizli||TR|ge|7zaw|83fs|68ds|ne:j64aex|1
Denow|denow|denov|UZ|1nt|4nne|87ck|ejtk|ne:j64465|1
Denpasar|denpasar||ID|67|fp2w|-1uqs|op1k|ne:j64jh5|1
Denton|denton||US|1q4|3siq|74am|-ktg8|ne:j648v7|1
Denver|denver|denver aurora|US|ek|1dkq0|8in7|-mi2s|ne:j64n0b|1
Dera Ghazi Khan|dera ghazi khan||PK|1f3|5265|6fy4|f50v|ne:j64bed|1
Dera Ismail Khan|dera ismail khan||PK|165|26eo|6tle|f722|ne:j64bfp|1
Derbent|derbent||RU|ft|29rh|90iq|acie|ne:j64cj7|1
Derby|derby||AU|1ve|2gv|-3phk|qkj6|ne:j64k4b|1
Derzhavinsk|derzhavinsk||KZ|3q|c88|ayb1|e7mr|ne:j64g1t|1
Des Moines|des moines||US|qb|85pr|8wu0|-k2dk|ne:j64m8v|1
Desaguadero|desaguadero||PE|be|441|-3jta|-esr6|ne:j64b03|1
Dese|dese|dessie|ET|2r|3xtm|2dvo|8hsc|ne:j64ksz|1
Detroit|detroit||US|13u|2fwco|92mv|-ht2c|ne:j64mtp|1
Deva|deva||RO|pa|1gbe|9u1d|4wtr|ne:j63upd|1
Devils Lake|devils lake||US|190|611|ab8i|-l6t1|ne:j6418l|1
Devonport|devonport||AU|1pl|ewl|-8tuf|vd3j|ne:j64m6n|1
Deyang|deyang||CN|1kv|39fm|6o85|mdk0|ne:j646k1|1
Dezful|dezful||IR|uz|6rfe|6xuk|adzw|ne:j64g6b|1
Dezhou|dezhou||CN|1ke|84v7|80yw|oxdk|ne:j64ew1|1
Dhaka|dhaka||BD|gh|7maj6|532a|jdky|ne:j64mzv|1
Dhamar|dhamar||YE|gi|43kr|34br|9ihv|ne:j643jb|1
Dhanbad|dhanbad||IN|rd|qpf4|53nr|iit0|ne:j64l8f|1
Dhangarhi|dhangarhi|dhangadhi|NP|8|1z7q|65eu|h9uy|ne:j63vtn|1
Dhule|dhule||IN|11a|a9nl|4h9k|g0xg|ne:j64jpl|1
Dhuusa Mareeb|dhuusa mareeb|dusmareb|SO|ka|cf|18b0|9yuw|ne:j63w2t|1
Diamantina|diamantina||BR|141|stb|-3wqo|-9chw|ne:j6476j|1
Diapaga|diapaga||BF|1p8|k2l|2l6q|duw|ne:j6402j|1
Dibaya|dibaya||CD|tk|gr|-1e87|4wgs|ne:j64f7v|1
Dibrugarh|dibrugarh||IN|4o|3kda|5w29|kc94|ne:j64jpn|1
Dickinson|dickinson||US|190|cnj|a1rc|-m14g|ne:j648cl|1
Diébougou|diebougou||BF|9a|9to|2ci8|-p28|ne:j6400b|1
Diego de Almagro|diego de almagro||CL|4w|dzt|-5ngw|-f0ic|ne:j64frh|1
Diekirch|diekirch||LU|gn|4te|aowh|1bkz|ne:j63wov|1
Dieppe|dieppe||FR|o0|wrh|apah|8cx|ne:j64fph|1
Diffa|diffa||NE|go|nws|2ur7|2pah|ne:j64b7p|1
Digby|digby||CA|19o|31p|9kb6|-e3et|ne:j64h73|1
Dijon|dijon||FR|9e|3n4q|a57c|12t8|ne:j64fox|1
Dikhil|dikhil||DJ|gq|9aj|2dog|92y0|ne:j63xap|1
Dikson|dikson|dickson|RU|1pq|ux|fr6m|h9hn|ne:j64mfj|1
Dila|dila||ET|1mp|10a5|1dgo|87lo|ne:j64fxv|1
Dili|dili||TL|gr|50t7|-1u1m|qwz7|ne:j64mb5|1
Dillingham|dillingham||US|26|1x4|cnom|-xyub|ne:j643mt|1
Dillon|dillon||US|14o|3fz|9ovx|-o5h4|ne:j6417t|1
Dilolo|dilolo||CD|tw|626|-2ak4|4sbp|ne:j64fab|1
Dimbokro|dimbokro||CI|164|1fyt|1fbd|-10cc|ne:j64gkl|1
Dimitrovgrad|dimitrovgrad||RU|1sc|2u0y|bmlk|ameo|ne:j64cdz|1
Dindigul|dindigul||IN|1p2|4axp|283c|gpuo|ne:j64kux|1
Dinguiraye|dinguiraye||GN|jb|4oe|2f6m|-2arg|ne:j63yiz|1
Dingzhou|dingzhou||CN|o3|3a06|892k|oncg|ne:j64etd|1
Diourbel|diourbel||SN|gt|367s|354c|-3hb4|ne:j64b6d|1
Dire Dawa|dire dawa||ET|gu|5enr|21zw|8yzs|ne:j64lxt|1
Dirj|dirj||LY|ku|pv|6grz|28on|ne:j64dc1|1
Dispur|dispur|gauhati|IN|4o|cgc|5lq8|jo2q|ne:j64l7x|1
Diu|diu||IN|fq|icj|4fvh|f7rk|ne:j6488h|1
Divinópolis|divinopolis||BR|141|45k8|-4bh3|-9mg8|ne:j64gpp|1
Divo|divo||CI|1n8|2qnv|191y|-15cw|ne:j63ykx|1
Diyarbakır|diyarbakir||TR|h1|dti3|84lg|8mf0|ne:j64agt|1
Djado|djado||NE|n|a|4i5i|2myr|ne:j64kab|1
Djambala|djambala||CG|1dx|7g3|-jlg|35t8|ne:j64ghf|1
Djanet|djanet||DZ|pv|ii|59g9|215z|ne:j64hzb|1
Djelfa|djelfa||DZ|h2|3nv9|7flc|p2s|ne:j64l4l|1
Djenné|djenne||ML|14t|pf4|2z94|-z3w|ne:j64mlh|1
Djibo|djibo||BF|1m1|h5b|30se|-cjy|ne:j63zu5|1
Djibouti|djibouti||DJ|h3|js6w|2hgu|98xk|ne:j64lrh|1
Djougou|djougou||BJ|ha|4chm|22uk|cyo|ne:j64hz5|1
Dnipro|dnipro|dnipropetrovsk|UA|h4|mi6o|ae37|7i1p|ne:j64lch|1
Doba|doba||TD|zh|mu5|1uqw|3m0k|ne:j64eet|1
Dobrich|dobrich||BG|h5|2167|9caz|5ytc|ne:j64i25|1
Doctor Pedro P. Peña|doctor pedro p pena||AR|jq|4qn|-4tgg|-dcpk|ne:j647xj|0
Dodge City|dodge city||US|t2|k0c|83cx|-lfqu|ne:j648pb|1
Dodoma|dodoma||TZ|h6|4of1|-1bpl|7nuk|ne:j64lnn|1
Doha|doha||QA|c|v2ts|5f42|b1mq|ne:j64lgd|1
Dolbeau|dolbeau|dolbeau mistassini|CA|1fv|aah|ah22|-fhct|ne:j64l0z|1
Doline|doline|deline|CA|19k|el|dyyh|-qgaf|ne:j647jn|1
Dolinsk|dolinsk||RU|1hz|991|a5cw|uluo|ne:j64csl|1
Dolo Bay|dolo bay|dolo|ET|1lr|942|wa1|90pt|ne:j64ktj|1
Dolores|dolores||AR|e6|jfq|-7sbo|-cd50|ne:j647tf|1
Dombarovskiy|dombarovskiy|dombarovsky|RU|1b5|7dg|avmi|crew|ne:j64cc3|1
Dondo|dondo||MZ|1lm|1ooo|-47dw|7fz8|ne:j64bsv|1
Dondo|dondo||AO|fe|1td|-22ro|33cc|ne:j64l37|1
Donegal|donegal||IE|h8|1xt|bpok|-1qmn|ne:j64675|1
Donetsk|donetsk|donets k|UA|h9|l6cg|aadv|83vs|ne:j64lcj|1
Đông Hà|dong ha||VN|1fm|dmm|3m0k|myn9|ne:j63ten|1
Đồng Hới|dong hoi||VN|1fi|421d|3qwh|muj4|ne:j64j1h|1
Dongguan|dongguan||CN|me|2p1ts|4xv0|odn8|ne:j64mw5|1
Dongola|dongola|karma|SD|19d|kdg|43w2|6j7l|ne:j64mcp|1
Dori|dori||BF|1o8|t66|30ac|-7s|ne:j6401h|1
Dortmund|dortmund||DE|18u|cm26|b1lw|1lhg|ne:j646fh|1
Dosso|dosso||NE|hd|12dy|2sp0|oow|ne:j64k7x|1
Dothan|dothan||US|23|1bn1|6ox7|-iavm|ne:j648x1|1
Douala|douala||CM|zc|14uog|vcg|22wo|ne:j64ldh|1
Douglas|douglas||IM||rny|blts|-ykg|ne:j64it1|1
Douglas|douglas||US|48|nah|6pyq|-nha4|ne:j64jtp|1
Douglas|douglas||US|ks|add|6r46|-hra3|ne:j648zn|1
Douglas|douglas||US|1vp|4uy|95wt|-ml5h|ne:j648n7|1
Douliou|douliou|douliu|TW|1wi|2aal|52xf|pu4f|ne:j6489t|1
Douma|douma|duma|SY|fz|amtt|774p|7sv4|ne:j643ix|1
Dourados|dourados||BR|137|3h5m|-4rj0|-bqx0|ne:j64k0b|1
Dover|dover||US|ga|1mo7|8e59|-g6r3|ne:j6431x|1
Dover|dover||GB|ud|s2o|ayjt|a14|ne:j64atx|1
Drammen|drammen||NO|al|1y02|ct38|26mr|ne:j64bbh|1
Dresden|dresden||DE|1hj|d8h7|axwk|2y3g|ne:j64lrj|1
Drobeta-Turnu Severin|drobeta turnu severin|drobeta turmu sererin|RO|13j|2a8i|9khn|4uw3|ne:j644pt|1
Drogheda|drogheda||IE|zz|s6t|bii1|-1cza|ne:j64dof|1
Drohobych|drohobych||UA|x9|2nvx|akqs|51bm|ne:j643xh|1
Drummondville|drummondville||CA|1fv|19wh|9u1d|-fjaa|ne:j647lt|1
Dryden|dryden||CA|1av|62e|ao4p|-jwb1|ne:j64k1z|1
Dubai|dubai||AE|hh|tk1k|5eov|buj0|ne:j64n0p|1
Dubăsari|dubasari||MD|1rf|hxy|a4on|6908|ne:j63w07|1
Dubbo|dubbo||AU|17q|od2|-6wx4|vul1|ne:j64m5v|1
Dublin|dublin||IE|hi|mp4o|bfja|-1c8d|ne:j64mvh|1
Dublin|dublin||US|ks|hgf|6z27|-hrsv|ne:j648zv|1
Dubrovnik|dubrovnik||HR|hj|sjm|9569|3vle|ne:j64efb|1
Dubuque|dubuque||US|qb|1c7n|93xt|-jfkl|ne:j648ob|1
Dudinka|dudinka||RU|1pq|i83|evmu|ihbe|ne:j64ja7|1
Duhok|duhok|dahuk|IQ|gp|l4sw|7wgr|97sg|ne:j640nt|1
Duisburg|duisburg||DE|18u|rd5h|b0u4|1g30|ne:j646fl|1
Duitama|duitama||CO|9g|261w|18zl|-fnfc|ne:j64e5b|1
Dulan|dulan||CN|kg|2s|7r2a|l28a|ne:j64lox|1
Duluth|duluth||US|142|1tfk|a0zd|-jqp4|ne:j64jt7|1
Dumas|dumas||US|1q4|ail|7ops|-lus5|ne:j648v3|1
Dumfries|dumfries||GB|hk|nyc|bswf|-re4|ne:j64adj|1
Dumont d'Urville Station|dumont d urville station||AQ||3c|-eb8n|tzyt|ne:j64iwl|1
Dumyat|dumyat|damietta|EG|hl|6f2b|6qfw|6tiw|ne:j64eg1|1
Dund-Us|dund us|hovd,khovd|MN|ow|nj8|aahy|jn1p|ne:j64lnb|1
Dundalk|dundalk||IE|zz|u04|bko4|-1dif|ne:j64doj|0
Dundee|dundee||GB|hm|38yw|c3q8|-n5c|ne:j64abz|1
Dundo|dundo||AO|10b|98x|-1ky0|4gq4|ne:j64l33|1
Dunedin|dunedin||NZ|1bj|2itg|-9u1y|10jim|ne:j64n67|1
Dunhua|dunhua||CN|rj|441q|9aht|rhco|ne:j64eyb|1
Dunhuang|dunhuang||CN|kg|303i|8lqr|kaf0|ne:j64lot|1
Duque de Caxias|duque de caxias||BR|1gm|i2dm|-4vp0|-9a6k|ne:j647ft|1
Durango|durango||MX|hp|9sqc|55fb|-mfn0|ne:j64je1|1
Durango|durango||US|ek|hxd|7zmc|-n4eo|ne:j648jj|1
Durazno|durazno||UY|hq|q9h|-75sk|-c418|ne:j64l8n|1
Durban|durban||ZA|wt|1mhpk|-6efb|6n11|ne:j64mux|1
Durham|durham||US|18z|6mt3|7ps0|-gwy8|ne:j642sh|1
Durrës|durres||AL|hr|31wg|8ut6|462a|ne:j64hnj|1
Dushanbe|dushanbe||TJ|1ol|na5g|89j4|eqnv|ne:j64mc1|1
Düsseldorf|dusseldorf||DE|18u|q5cw|az7w|1gbc|ne:j64ekh|1
Dutse|dutse||NG|rg|d7t|2j1k|205b|ne:j640il|1
Dyatkovo|dyatkovo||RU|a0|pvb|bhhv|7cyo|ne:j645bj|1
Dzaoudzi|dzaoudzi||YT|15g|oqh|-2qnz|9pce|ne:j64itv|1
Dzerzhinsk|dzerzhinsk||RU|18e|5hy1|c214|9bc8|ne:j64bzj|1
Dzhankoy|dzhankoy|dzhankoi|RU|fa|xuv|9sr6|7dfk|ne:j649ml|1
Dzuunmod|dzuunmod|zuunmod|MN|1s6|doq|a852|mx7i|ne:j63w81|1
Eagle|eagle||US|26|2w|dvwo|-u9i8|ne:j643t5|1
Eagle Pass|eagle pass||US|1q4|153w|65ja|-ljdp|ne:j648sz|0
East London|east london||ZA|i3|79ab|-72ec|5z1o|ne:j64lhn|1
Eastmain|eastmain||CA|1fv|9b|b719|-gtu7|ne:j647mf|1
Eau Claire|eau claire||US|1vm|1pj0|9lrm|-jm08|ne:j642zb|1
Ebebiyín|ebebiyin||GA|1vo|j5r|gm2|2ff8|ne:j63xyz|1
Ebolowa|ebolowa||CM|1n7|1vsz|mdk|2e18|ne:j64m2n|1
Echuca|echuca||AU|17q|f0h|-7qs0|v0wc|ne:j64ia1|1
Ed Dueim|ed dueim||SD|1vk|1v6k|2zy8|6x88|ne:j64aaz|1
Edéa|edea||CM|zc|4cr1|tbp|2634|ne:j64hlj|1
Edinburg|edinburg||US|1q4|37qo|5myg|-l1eo|ne:j648t3|1
Edinburgh|edinburgh||GB|i7|atmu|bzp7|-ou7|ne:j64j25|1
Edirne|edirne||TR|i8|2pl2|8xj4|5p0k|ne:j64aeb|1
Edmonton|edmonton||CA|29|mocw|bh7k|-obsb|ne:j64mzj|1
Edmundston|edmundston||CA|17l|dt2|a5ky|-en9h|ne:j64h6l|1
Eger|eger||HU|od|17pj|a9k6|4d9y|ne:j63u7p|1
Egilsstaðir|egilsstadir||IS|59|1qx|dzlu|-332m|ne:j64a7t|1
Egvekinot|egvekinot||RU|dy|1qg|e7qt|-12el9|ne:j64bwz|1
Eidsvold|eidsvold||AU|1fn|cr|-5fq6|we5h|ne:j64ijb|1
Eindhoven|eindhoven||NL|18k|8j51|b0u4|16fs|ne:j6451t|1
Eirunepé|eirunepe||BR|2q|gs6|-1fe0|-ez5e|ne:j64kvl|1
Eisenstadt|eisenstadt||AT|ad|a5p|a931|3jkl|ne:j63zln|1
Ekibastuz|ekibastuz||KZ|1cq|2qnw|b35g|g567|ne:j64lyb|1
El Agheila|el agheila|al ugaylah|LY|y|2s|6hgq|445c|ne:j64ddz|1
El Alamein|el alamein||EG|138|5pk|6lsb|67do|ne:j64egb|1
El Arish|el arish|arish|EG|1kc|3tuj|6o5t|78t2|ne:j64eit|1
El Banco|el banco||CO|114|162i|1xg3|-fuu0|ne:j64eah|1
El Bayadh|el bayadh||DZ|ic|1g0l|77yg|7sk|ne:j64hzn|1
El Calafate|el calafate||AR|1j8|668|-asdh|-fhvc|ne:j64m2v|1
El Carmen de Bolívar|el carmen de bolivar||CO|90|1b1w|2304|-g3pg|ne:j64e9z|1
El Cayo|el cayo|san ignacio|BZ|c8|d3l|3odk|-j376|ne:j640sp|1
El Centro|el centro||US|bd|yq0|7110|-orng|ne:j648gn|1
El Daba|el daba|el dabaa|EG|138|ays|6ngi|63e5|ne:j64egf|1
El Dorado|el dorado||US|49|hao|74a3|-juzl|ne:j648nx|1
El Dorado|el dorado||VE|8w|1u7|1fyd|-d7kd|ne:j64jwz|1
El Faiyum|el faiyum|faiyum|EG|1b|6sf8|6a5o|6lyo|ne:j64lr5|1
El Fasher|el fasher|al fashir|SD|19g|5ewx|2x64|5flo|ne:j64kb5|1
El Fuerte|el fuerte||MX|1l5|8mb|5nv0|-na48|ne:j64cv7|1
El Goléa|el golea|el menia|DZ|kx|oq9|6juq|m8x|ne:j64l4b|1
El Jadida|el jadida||MA|he|3v92|74n0|-1tnw|ne:j64brz|1
El Kef|el kef|le kef|TN|yh|110r|7r6q|1v8s|ne:j649f1|1
El Kharga|el kharga|el kharga town|EG|1y|12kn|5gao|6jq4|ne:j64knp|1
El Maitén|el maiten||AR|dx|3al|-90gk|-f94i|ne:j647ph|1
El Manaqil|el manaqil||SD|kt|395f|31yg|72h4|ne:j64a9p|1
El Mansura|el mansura|sharkia|EG|b|cuyo|6nl4|6q4o|ne:j64efx|1
El Manteco|el manteco||VE|8w|1pj|1kps|-deid|ne:j6498z|1
El Minya|el minya|minya|EG|1t|apsw|60qs|6l9o|ne:j64knl|1
El Oued|el oued||DZ|8f|3syh|75hk|1gxk|ne:j64hzt|1
El Paso|el paso||US|1q4|g50o|6t8b|-mtun|ne:j64lap|1
El Porvenir|el porvenir||PA|wk|a|21mh|-gxco|ne:j640hd|1
El Progreso|el progreso||GT|ig|35kt|36l0|-jakn|ne:j63xkz|1
El Qasr|el qasr||EG|1y|1bo|5ib0|66v5|ne:j64ehj|1
El Seibo|el seibo|santa cruz del seibo|DO|ih|i63|40s8|-esoe|ne:j63xvf|1
El Tigre|el tigre||VE|3i|48cg|1wlj|-dru0|ne:j6499d|1
El Tur|el tur|el tor|EG|r3|lbg|61wa|77dg|ne:j64eip|1
Elâzığ|elazig||TR|ii|5thg|8agg|8ep8|ne:j644gh|1
Elbasan|elbasan||AL|ij|3jbm|8tan|4ayu|ne:j64835|1
Elbląg|elblag||PL|1uw|2qfa|bm4s|45pn|ne:j6461f|1
Eldama Ravine|eldama ravine||KE|1gi|dkd|e0|7nm8|ne:j64b9h|1
Eldikan|eldikan||RU|1hy|164|d14w|sz2x|ne:j64jbt|1
Eldorado|eldorado||AR|147|ded|-5m5s|-bpao|ne:j64825|1
Eldorado|eldorado|el dorado|MX|1l5|ded|57qh|-n0h0|ne:j64cvd|1
Eldoret|eldoret||KE|1gi|7ko5|40g|7k58|ne:j64loh|1
Elephant Island|elephant island||AQ||6|-dae4|-cfj4|ne:j64iup|1
Elgin|elgin||US|pu|8cju|90dn|-ix8z|ne:j642nx|1
Elista|elista||RU|so|2ajf|9xh3|9h47|ne:j64kfl|1
Ełk|elk||PL|1uw|1715|bjdt|4sgc|ne:j64dep|1
Elkhart|elkhart||US|q5|3746|8xml|-ifc8|ne:j642qj|1
Elko|elko||US|17j|eus|8r2d|-ot84|ne:j64l9v|1
Elmira|elmira||US|17s|1c4o|90rp|-ggnk|ne:j6497v|1
Ely|ely||US|17j|394|8ety|-omh9|ne:j64ixn|1
Ely|ely||US|142|2vn|a9lo|-joj5|ne:j648bv|1
Embi|embi||KZ|3s|eh4|agr0|cgn6|ne:j64g0f|1
Embu|embu||KE|i2|198c|-40c|80ys|ne:j64b8p|1
Emden|emden||DE|182|13ra|bfs3|1jon|ne:j646gh|1
Emerald|emerald||AU|1fn|792|-51f6|vr9l|ne:j64imj|1
Emmonak|emmonak||US|26|2s|dge2|-z9gu|ne:j643on|1
Emporia|emporia||US|t2|mew|88bu|-km52|ne:j648p1|1
En Nuhud|en nuhud|en nahud|SD|1mf|2bc8|2px4|63ag|ne:j64av3|1
Encarnación|encarnacion||PY|qp|7njz|-5v0g|-bz4j|ne:j644zh|1
Ende|ende||ID|1a1|1nkl|-1wdr|q2nd|ne:j64e25|1
Engels|engels||RU|1jk|478r|b1do|9vv4|ne:j64ccx|1
Enid|enid||US|1ao|zlm|7stv|-kz8d|ne:j641u3|1
Ennadai|ennadai||CA|19z|0|d3ph|-lmf5|ne:j64kzz|1
Ensenada|ensenada||MX|62|5hyt|6tws|-ozug|ne:j64jdt|1
Entebbe|entebbe||UG|1us|3r4o|gs|6ygo|ne:j64alj|1
Enterprise|enterprise||US|23|iod|6pq6|-iedk|ne:j648xf|1
Entre Ríos|entre rios||BO|1pf|22l|-4m4k|-drak|ne:j6486l|1
Enugu|enugu||NG|io|erj2|1dro|1lvc|ne:j64mgj|1
Enurmino|enurmino||RU|dy|89|ecl8|-10tqu|ne:j6459z|1
Er Rachidia|er rachidia|errachidia|MA|13k|4wax|6ugc|-yc4|ne:j64brn|1
Erdenet|erdenet||MN|1b6|1pgf|aihx|mbdr|ne:j64mgp|1
Erechim|erechim||BR|1gl|2253|-5x70|-b7bg|ne:j647ah|1
Ereğli|eregli||TR|vz|1z2t|81ef|7aqt|ne:j64ajn|1
Erenhot|erenhot||CN|17d|h73|9cw8|nzxj|ne:j64jnf|1
Erfurt|erfurt||DE|1qd|4cty|axad|2d3w|ne:j646gp|1
Erie|erie||US|1cy|3thi|912r|-h5xu|ne:j6498h|1
Erldunda|erldunda||AU|19i|a|-5ep9|sjs0|ne:j64k41|1
Ermoupoli|ermoupoli|ermoupolis|GR|19l|9gk|80yw|5cdx|ne:j64fvn|1
Ersekë|erseke||AL|w3|636|8n7p|4fld|ne:j63yr3|0
Ertis|ertis||KZ|1cq|740|bfm5|g66b|ne:j64g3b|1
Erymentau|erymentau|ereymentau|KZ|3q|jed|b2dr|fo2x|ne:j64g2f|1
Erzincan|erzincan||TR|ir|2run|8iqf|8gq8|ne:j64agj|1
Erzurum|erzurum||TR|is|90lv|8k10|8ulg|ne:j64agf|1
Esbjerg|esbjerg||DK|1o2|1jpp|bvzi|1t78|ne:j64ght|1
Escanaba|escanaba||US|13u|dd2|9sz5|-insk|ne:j649bz|1
Escudero Base|escudero base|profesor julio escudero base|AQ||k|-dbwe|-cmvr|ne:j64iun|1
Escuinapa|escuinapa|escuinapa de hidalgo|MX|1l5|lso|4wbc|-mocw|ne:j64cuv|1
Escuintla|escuintla||GT|it|2b1y|32cc|-jggo|ne:j64fct|1
Escuintla|escuintla||MX|da|2b1y|3aac|-juqk|ne:j645zl|1
Eséka|eseka||CM|cg|h59|s60|2b2q|ne:j64hm5|1
Esik|esik||KZ|2e|r93|9amz|glk6|ne:j64647|1
Esil|esil||KZ|3q|af4|b4wi|e867|ne:j64g1n|1
Eskişehir|eskisehir||TR|iv|b19x|8j26|6jkk|ne:j64k3n|1
Esmeraldas|esmeraldas||EC|iw|3pkd|76g|-h2qk|ne:j64e7d|1
Esperance|esperance||AU|1ve|634|-798t|q4i1|ne:j64k4v|1
Esperanza|esperanza||MX|1lw|2yk|5wt4|-nk84|ne:j645st|1
Esperanza Base|esperanza base|esperanza station|AQ||6y|-dl09|-c80j|ne:j64iw7|1
Espungabera|espungabera||MZ|11w|ax|-4dsl|70us|ne:j64bjv|1
Esquel|esquel||AR|dx|fgw|-970o|-faa6|ne:j64k2l|1
Essen|essen||DE|18u|11c8n|b0zo|1i52|ne:j646fv|1
Estância|estancia||BR|1k5|16xy|-2eyg|-80ys|ne:j64gy1|1
Estelí|esteli||NI|j1|2b7j|2t04|-iicw|ne:j644zv|1
Etawah|etawah||IN|1sy|5inc|5qof|gxom|ne:j64gbz|1
Eugene|eugene||US|1b3|595y|9fw4|-qdug|ne:j64ju7|1
Eumseong|eumseong||KR|e0|7rx|7wzt|rd9d|ne:j644id|1
Eureka|eureka||US|bd|wpq|8qty|-qlxf|ne:j64l9n|1
Evanston|evanston||US|pu|7i28|90g3|-isp4|ne:j642n5|1
Evansville|evansville||US|q5|3qc6|850j|-irl2|ne:j64jvx|1
Evensk|evensk||RU|111|1k8|da0c|y4nh|ne:j64jdd|1
Everett|everett||US|1ux|afp3|aa2c|-q6wg|ne:j648et|1
Evinayong|evinayong||GQ|ch|6j2|b6s|29j7|ne:j63x5z|1
Évora|evora||PT|1xs|16x0|89j4|-1p04|ne:j63vf1|1
Ewo|ewo||CG|fm|87u|-6sc|36co|ne:j64ffn|1
Exeter|exeter||GB|gg|2fa6|av7g|-r8j|ne:j64acj|1
Exmouth|exmouth||AU|1ve|u5|-4p7z|ogkx|ne:j64k4f|1
Eyl|eyl||SO|19y|el4|1pll|aoil|ne:j64kg5|1
Eyumojok|eyumojok|eyumodjock|CM|1nc|4h2|18dc|1xbd|ne:j64h8p|1
Fada|fada||TD|84|cg|3olj|4mla|ne:j64kn3|1
Fada Ngourma|fada ngourma|fada n gourma|BF|lp|q5y|2l0m|2sa|ne:j63zgv|1
Fairbanks|fairbanks||US|26|17z5|dwaa|-vnqr|ne:j64mal|1
Faisalabad|faisalabad||PK|1f3|1k3ag|6qdj|fo3t|ne:j64j4v|1
Faizabad|faizabad||IN|1sy|3a3b|5qeo|hm10|ne:j64gb3|1
Falfurrias|falfurrias||US|1q4|44l|5u31|-l1ah|ne:j648ul|1
Falmouth|falmouth||JM|1rj|603|3yl8|-gn74|ne:j63x0x|1
False Pass|false pass||US|26|z|br8g|-z0x2|ne:j649if|1
Falun|falun||SE|fy|s59|czoy|3cqe|ne:j63ump|1
Famagusta|famagusta||||wta|7j0y|79yk|ne:j6488x|1
Farafangana|farafangana||MG|jj|j3w|-4w1y|a930|ne:j64kld|1
Farah|farah||AF|ja|1ktr|6xxp|db54|ne:j64l31|1
Faranah|faranah||GN|jb|f0t|25h0|-2ay4|ne:j64gjb|1
Fargo|fargo||US|190|3hne|a1pg|-kqty|ne:j64l93|1
Fargona|fargona|fergana|UZ|ji|g2pc|8nng|fduw|ne:j64j0x|1
Faribault|faribault||US|142|jkw|9hqx|-jzns|ne:j6414b|1
Faridabad|faridabad||IN|nr|tvm8|63ep|gkkb|ne:j64lv3|1
Farim|farim||GW|1ak|58o|2oea|-39hq|ne:j63wgv|1
Farmington|farmington||US|17p|xe6|7vli|-n6rp|ne:j641jb|1
Faro|faro||PT|jc|vwr|7xmj|-1p7p|ne:j64b5x|1
Fasa|fasa||IR|jd|2o16|67jq|bi4r|ne:j64g57|1
Fatehpur|fatehpur||IN|1sy|3kgg|5jp0|hbgg|ne:j64gax|1
Fatick|fatick||SN|jf|ipf|32og|-3io0|ne:j63vj1|1
Faya Largeau|faya largeau|faya|TD|84|ac8|3u8v|43i7|ne:j64kn5|1
Fayetteville|fayetteville||US|18z|57qi|7ijp|-gwo4|ne:j6493b|1
Fayetteville|fayetteville||US|49|3913|7q9i|-k6is|ne:j648nt|1
Fderik|fderik|fderick|MR|1qm|4g0|4uzq|-2q1q|ne:j640mp|1
Feira de Santana|feira de santana||BR|60|abuf|-2mis|-8cp0|ne:j64mnj|1
Felipe Carrillo Puerto|felipe carrillo puerto||MX|1ft|j53|4730|-ivec|ne:j64d35|1
Fengcheng|fengcheng||CN|rf|1bfh|61lg|otac|ne:j64ewd|1
Fengjie|fengjie||CN|dv|11xs|6nl4|nh1b|ne:j64dw3|1
Fengzhen|fengzhen||CN|17d|24iu|8o5f|o90z|ne:j64f1h|1
Ferfer|ferfer||SO|oh|4mo|138m|9ohu|ne:j64ci7|1
Ferkessédougou|ferkessedougou||CI|1js|1bug|222s|-144g|ne:j64gi5|1
Fernandópolis|fernandopolis||BR|1o6|1bsb|-4ceg|-art4|ne:j64hk7|1
Ferrara|ferrara||IT|il|2t2o|9m2g|2hkz|ne:j64dq7|1
Ferreñafe|ferrenafe||PE|y1|12q0|-1f5o|-h3qo|ne:j644sj|1
Feyzabad|feyzabad|fayzabad|AF|5r|1dxc|7yhu|f4lc|ne:j64hpp|1
Fez|fez|f s,fes|MA|k2|lh5c|7as5|-12lj|ne:j64mdp|1
Fianarantsoa|fianarantsoa||MG|jj|3y48|-4ldp|a3ap|ne:j64lpt|1
Fier|fier||AL|jk|1ri1|8q9w|470y|ne:j63yo1|1
Filadelfia|filadelfia||PY|93|82u|-4sdk|-cv70|ne:j64k9v|1
Finnsnes|finnsnes||NO|1rp|30j|eu9i|3uye|ne:j6451l|1
Firozabad|firozabad||IN|1sy|6kfd|5tho|gswd|ne:j6472l|1
Flagstaff|flagstaff||US|48|1ddl|7jl9|-nxi1|ne:j64l9f|1
Flensburg|flensburg||DE|1jw|23ka|bqpp|20sd|ne:j64elv|1
Flin Flon|flin flon||CA|121|4xl|bqky|-lu4x|ne:j64kyn|1
Flint|flint||US|13u|6bsc|97w1|-hxqj|ne:j649b7|1
Florence|florence||IT|1r5|w5eo|9dt4|2et0|ne:j64lo7|1
Florence|florence||US|1m7|18bi|7but|-h3gc|ne:j6490l|1
Florence|florence||US|23|yzp|7gil|-isis|ne:j642bp|1
Florencia|florencia||CO|bu|2skh|cfc|-g7hk|ne:j64e8z|1
Flores|flores||GT|1d9|tcj|3mnt|-j9jl|ne:j64fcf|1
Floriano|floriano||BR|1do|11hn|-1g8g|-980s|ne:j64gvb|1
Florianópolis|florianopolis||BR|1j7|lxco|-5wsk|-aeec|ne:j64mnh|1
Florida|florida||UY|jp|ove|-7b3y|-c1ra|ne:j63t33|1
Focșani|focsani||RO|1uh|293s|9sli|5trt|ne:j644sd|1
Foggia|foggia||IT|3m|3br7|8vwt|3c28|ne:j64drp|1
Fond du Lac|fond du lac||US|1vm|15wb|9dra|-iygl|ne:j6495f|1
Fonte Boa|fonte boa||BR|2q|ce4|-jea|-e5ys|ne:j64kvj|1
Forbes|forbes||AU|17q|3qe|-75mw|vq4o|ne:j64ibd|1
Forecariah|forecariah||GN|va|9ja|20rg|-2t2c|ne:j63yhf|1
Formiga|formiga||BR|141|17is|-4dvc|-9qjg|ne:j6477p|1
Formosa|formosa||AR|jq|4qtj|-5ly8|-cgxw|ne:j64m3f|1
Formosa|formosa||BR|le|1qog|-3bwj|-a5a0|ne:j64hdl|1
Forster-Tuncurry|forster tuncurry|forster|AU|17q|dkn|-6wej|wowi|ne:j64k55|1
Fort Chipewyan|fort chipewyan||CA|29|2hi|cl2b|-ntn0|ne:j64gzx|1
Fort Collins|fort collins||US|ek|4w81|8oyv|-min1|ne:j648iv|1
Fort-de-France|fort de france||MQ|12m|5fzf|34qg|-d3ao|ne:j64ech|1
Fort Good Hope|fort good hope||CA|19k|gl|e7be|-rkjh|ne:j64mob|1
Fort Lauderdale|fort lauderdale||US|jp|17rne|5lo1|-h6dm|ne:j648yn|1
Fort-Liberté|fort liberte||HT|18n|8uh|47qo|-fecw|ne:j63tld|1
Fort McMurray|fort mcmurray||CA|29|gvb|c5r9|-nvft|ne:j64m1l|1
Fort McPherson|fort mcpherson||CA|19k|tp|egrn|-swuu|ne:j64h27|1
Fort Nelson|fort nelson||CA|9t|4vf|cltz|-q9gy|ne:j64kzj|1
Fort Pierce|fort pierce||US|jp|4w45|5vs4|-h7sq|ne:j648y1|1
Fort Portal|fort portal||UG|s4|wxa|56e|6hlq|ne:j63u1z|1
Fort Resolution|fort resolution||CA|19k|cg|d3yq|-od6m|ne:j64l03|1
Fort Severn|fort severn||CA|1av|3h|bzyx|-isb8|ne:j64mol|1
Fort Shevchenko|fort shevchenko||KZ|11u|40t|9jhv|aruy|ne:j64g7f|1
Fort Simpson|fort simpson||CA|19k|7v|d98k|-q07p|ne:j64l05|1
Fort Smith|fort smith||US|49|20is|7l1i|-k8ds|ne:j648np|1
Fort Smith|fort smith||CA|29|ee|cuyo|-nzap|ne:j64m1j|1
Fort St. John|fort st john||CA|9t|ehk|c210|-pwct|ne:j64m1p|1
Fort Stockton|fort stockton||US|1q4|5yh|6md1|-m1v6|ne:j648uv|1
Fort Wayne|fort wayne||US|q5|6fdr|8sz8|-i8v8|ne:j6492t|1
Fort William|fort william||GB|og|7g4|c6ed|-13g1|ne:j6489b|1
Fort Yukon|fort yukon||US|26|n5|e9m7|-v4xu|ne:j64jy5|1
Fortaleza|fortaleza||BR|ca|257kf|-sx5|-89p7|ne:j64mzf|1
Forteau|forteau||CA|17t|cg|b0zs|-c7fg|ne:j64h83|1
Fortin Falcon|fortin falcon||PY|1en|0|-4xuv|-ctsz|ne:j644xb|1
Foshan|foshan||CN|me|k7mg|4xps|o8tp|ne:j64jh1|1
Foumban|foumban||CM|1br|1zi9|187s|2c3s|ne:j64h8d|1
Fox Bay|fox bay|fox bay west|FK||3c|-b4uq|-cvmu|ne:j64isv|1
Foz do Iguaçu|foz do iguacu||BR|1ch|9fuv|-5gxv|-bor8|ne:j64gtf|1
Franca|franca||BR|1o6|6jdd|-4ees|-a5nw|ne:j64l2v|1
Franceville|franceville|masuku|GA|nx|x5j|-clp|2wt5|ne:j64lw1|1
Francistown|francistown||BW|cd|1xff|-4jck|5w6w|ne:j64m4z|1
Frankfort|frankfort||US|uf|sb4|86rc|-i6vy|ne:j64izl|1
Frankfurt|frankfurt|frankfurt am main|DE|oc|1q1so|aqko|1uxq|ne:j64mwn|1
Frauenfeld|frauenfeld||CH|1qb|gyj|a71c|1ya0|ne:j63ul5|1
Fray Bentos|fray bentos||UY|1h9|hyn|-73pa|-chvk|ne:j63t1z|0
Fredericksburg|fredericksburg||US|1u5|2uq6|87jv|-glow|ne:j6494j|1
Fredericton|fredericton||CA|17l|14dt|9ujw|-ea59|ne:j64l1d|1
Frederikshavn|frederikshavn||DK|18s|ilj|cb5t|299x|ne:j64ghx|1
Freeport|freeport||US|1q4|1lsc|67gb|-kfs1|ne:j64iyl|1
Freeport|freeport||BS||jl3|5oqd|-gv94|ne:j64m7p|1
Freetown|freetown||SL|1vd|hq48|1tdc|-2u4q|ne:j64mch|1
Freiburg|freiburg|freiburg im breisgau|DE|5s|5go9|aadg|1oq3|ne:j64ekp|1
Fresnillo|fresnillo||MX|1wo|29e8|4ys8|-m1o8|ne:j64cwv|1
Fresno|fresno||US|bd|d7kx|7vjp|-po6a|ne:j64l9l|1
Fria|fria||GN|8u|ib5|283g|-2wjw|ne:j64git|1
Frias|frias||AR|1jg|ahm|-6528|-dyp8|ne:j64hhj|1
Fribourg|fribourg||CH|jt|pbv|a140|1j64|ne:j63wc3|1
Frolovo|frolovo||RU|1ua|vjm|ao1m|9cti|ne:j64c3h|1
Frontera|frontera||MX|1of|hgd|3zd8|-juw4|ne:j64d0l|1
Frutal|frutal||BR|141|vkz|-4ajw|-ahmg|ne:j6477v|1
Ft. Dodge|ft dodge|fort dodge|US|qb|kqn|93zg|-k6p7|ne:j641ov|1
Ft. Myers|ft myers|fort myers|US|jp|41j2|5pk3|-hjn1|ne:j64jvh|1
Ft.  Worth|ft worth|fort worth|US|1q4|uvgm|70mg|-kv2w|ne:j64lah|1
Fuan|fuan|fu an|CN|jy|1zcm|5svk|pmzs|ne:j64dwt|1
Fuerte Olimpo|fuerte olimpo||PY|2i|1wr|-4iko|-cerc|ne:j64b3h|1
Fujin|fujin||CN|o5|1x0i|a4qo|sao8|ne:j64f1z|1
Fukui|fukui||JP|jz|5bwj|7qbk|t72w|ne:j64f5b|1
Fukuoka|fukuoka|fukuoka kitakyushu|JP|k0|1nubk|778i|ry8h|ne:j64lt3|1
Fukushima|fukushima||JP|k1|6b19|837c|u3vg|ne:j64jop|1
Fulacunda|fulacunda||GW|1fr|10f|2iua|-398u|ne:j63wh3|1
Fulin|fulin||CN|1kv|t5|6ags|m0kf|ne:j64jkd|1
Funafuti|funafuti||TV||3nx|-1tpr|12eue|ne:j64l5b|1
Funchal|funchal||PT|10t|4dzz|6zxg|-3m8w|ne:j64ka1|1
Funtua|funtua||NG|tx|3v97|2gw4|1khc|ne:j64dat|1
Fürth|furth||DE|7k|53is|alpo|2cvk|ne:j646hd|1
Fushun|fushun|fushun liaoning|CN|ys|vi9c|8z1t|qjrt|ne:j64jlz|1
Fuxin|fuxin||CN|ys|gi4w|9064|q2px|ne:j64jlv|1
Fuyang|fuyang||CN|1x7|giwo|6fwp|ppjg|ne:j64kon|1
Fuyang|fuyang||CN|36|3n6v|71v0|oto8|ne:j64dxp|1
Fuzhou|fuzhou|fuzhou fujian|CN|jy|1jusw|5l8z|pkid|ne:j64mw1|1
Gaalkacyo|gaalkacyo|galkayo|SO|15l|1b80|1g8k|a5z0|ne:j64kg3|1
Gabès|gabes||TN|k5|4pdp|79ks|25xk|ne:j649fb|1
Gaborone|gaborone||BW|1mj|4gt7|-5a67|5jxr|ne:j64mr5|1
Gabú|gabu||GW|k6|b4u|2mr4|-31tw|ne:j63whn|1
Gadabay|gadabay||AZ|k3|6oh|8p08|9tip|ne:j63z1h|1
Gadsden|gadsden||US|23|w6l|7agi|-ifmq|ne:j648xb|1
Gafsa|gafsa||TN|k7|2pub|7dl8|1vqw|ne:j649ff|1
Gagnoa|gagnoa||CI|jw|2n1s|1bgg|-19dc|ne:j64gjv|1
Gainesville|gainesville||US|jp|43g9|6csi|-hn82|ne:j64jvf|1
Galați|galati||RO|k9|6o38|9qqn|60ej|ne:j644rz|1
Galena|galena||US|26|dw|dvhh|-xmuu|ne:j64jxv|1
Galesburg|galesburg||US|pu|ori|8rye|-jdb3|ne:j642lp|1
Galle|galle||LK|kc|24ra|1aj0|h74w|ne:j64j2j|1
Gallup|gallup||US|17p|id4|7m3t|-nazw|ne:j648kx|1
Galveston|galveston||US|1q4|1gxw|6a37|-kbgn|ne:j64iyj|1
Galway|galway||IE|kd|1mbu|bf1w|-1xtk|ne:j64don|1
Gamba|gamba||GA|1af|7ns|-kg4|255s|ne:j64kqf|1
Gambell|gambell||US|26|ix|do4l|-10t33|ne:j64j0f|1
Gamboma|gamboma||CG|1dx|g3x|-ei3|3eas|ne:j64ghb|1
Ganca|ganca|ganja|AZ|k4|6i04|8pxe|9xn0|ne:j6483n|1
Gandajika|gandajika||CD|tm|3b5l|-1g04|54vk|ne:j64fa1|1
Gander|gander||CA|17t|2kx|ahp8|-bows|ne:j64l1j|1
Gandhinagar|gandhinagar||IN|fq|475f|4zsc|fkhr|ne:j64gg3|1
Gangneung|gangneung||KR|kf|3vcz|83br|rmki|ne:j64cjh|1
Gangtok|gangtok||IN|1l2|1o3w|5uwl|izrq|ne:j64735|1
Gannan|gannan||CN|o5|19pj|a9r8|qh0c|ne:j64f2h|1
Ganzhou|ganzhou||CN|rf|w5eo|5k00|omyk|ne:j64jmf|1
Gao|gao||ML|ki|2i93|3hii|-dw|ne:j64lwb|1
Gaoua|gaoua||BF|1e7|lmf|27o2|-oho|ne:j6400p|1
Gaoual|gaoual||GN|8u|5r9|2ip0|-2tya|ne:j63ygh|1
Gar|gar||CN|1vt|7ps|6wgk|h55l|ne:j64eov|1
Garanhuns|garanhuns||BR|1d4|2cxx|-1wlg|-7tmw|ne:j64l2x|1
Garbahaarey|garbahaarey|garbahaareey|SO|ko|9rg|po6|91tq|ne:j63w1l|1
Garça|garca||BR|1o6|vva|-4rg8|-an6g|ne:j6481b|1
Garden City|garden city||US|t2|m1g|850o|-lm9t|ne:j641qb|1
Gardiz|gardiz|gardez|AF|1c4|27xt|779d|eu2a|ne:j64is5|1
Garissa|garissa||KE|19a|1gd1|-3e4|8i3g|ne:j64bal|1
Garoowe|garoowe||SO|19y|1zc|1stc|ae88|ne:j64kg7|1
Garoua|garoua||CM|18m|9d43|1zrc|2vbg|ne:j64m3x|1
Gary|gary||US|q5|co5o|8wu4|-ipuc|ne:j6492p|1
Garzón|garzon||CO|p8|17ob|h20|-g7pw|ne:j64e9d|1
Gashua|gashua||NG|1wa|2p2x|2rb5|2d6o|ne:j64dbb|1
Gaspé|gaspe||CA|1fv|2u5|agtx|-dtmu|ne:j64l0v|1
Gastre|gastre||AR|dx|fh|-929a|-eu7h|ne:j64hap|1
Gatchina|gatchina||RU|ym|1xti|crnf|6gid|ne:j64by7|1
Gavarr|gavarr|gavar|AM|kp|gq8|8net|9o77|ne:j63z0t|1
Gävle|gavle||SE|my|1gyj|d03y|3ogi|ne:j649lf|1
Gawler|gawler||AU|1m5|cmi|-7f16|tqf4|ne:j64igb|1
Gay|gay|gai|RU|1b5|w43|b16j|cj1b|ne:j64ccd|1
Gaya|gaya||IN|88|92x8|5bcw|i7v4|ne:j64jsz|1
Gaya|gaya||NE|hd|pi3|2jqa|qlf|ne:j64awj|1
Gaza City|gaza city|gaza|PS||au78|6rac|7ds2|ne:j64m7h|1
Gaziantep|gaziantep|aintab|TR|km|mdk0|7y35|80g6|ne:j64k7d|1
Gbadolite|gbadolite||CD|1xr|12yl|x3s|4i6v|ne:j64edj|1
Gbarnga|gbarnga||LR|91|zd7|1i3c|-2184|ne:j64b77|1
Gdańsk|gdansk|danzig|PL|1e5|fuzk|bng0|3zts|ne:j64lmz|1
Gdynia|gdynia||PL|1e5|6qso|book|3yz8|ne:j64dev|1
Gedaref|gedaref|al qadarif|SD|kn|4bb6|30c0|7kzs|ne:j64kap|1
Geelong|geelong||AU|1tx|3g7z|-86i3|uy5w|ne:j64k5z|1
Geita|geita||TZ|15v|16o|-m46|6w76|ne:j64aoj|1
Gejiu|gejiu||CN|1wj|371t|50eg|m3wt|ne:j64lsh|1
Gelendzhik|gelendzhik||RU|wb|16tw|9jxw|85pg|ne:j64c4j|1
Gemena|gemena||CD|1xr|48tk|p5k|48jo|ne:j64kn1|1
Gen. O'Higgins Base|gen o higgins base|base general bernardo o higgins riquelme|AQ||18|-dkn8|-ceog|ne:j64iw5|1
Geneina|geneina||SD|1v5|3hr9|2vs4|4t5c|ne:j64lfl|1
General Conesa|general conesa||AR|1fx|2a6|-8lew|-dt65|ne:j647uj|1
General Eugenio Alejandrino Garay|general eugenio alejandrino garay|fortin coronel eugenia garay|PY|92|r0|-4ec0|-dc0k|ne:j644wp|1
General Guemes|general guemes||AR|1i5|fas|-5abu|-dxxg|ne:j647wn|1
General Pico|general pico||AR|xh|1805|-7n5g|-do1w|ne:j64hfj|1
General Roca|general roca||AR|1h9|1kho|-8d2w|-ehok|ne:j647u5|1
General Santos|general santos||PH|1m8|kdfm|1b5g|qtur|ne:j64lk7|1
Geneva|geneva||CH|kr|qksg|9wk4|1bdk|ne:j64n0x|0
Genhe|genhe||CN|17d|x29|avuh|q1mn|ne:j646n7|1
Genoa|genoa||IT|yx|dvm1|9io4|1wwk|ne:j64kjt|1
Gent|gent|gand,ghent|BE|hy|9iuo|axr0|sjs|ne:j6483f|1
George|george||ZA|1vf|3qpi|-79yk|4t84|ne:j64lgp|1
George Town|george town|penang,pinang|MY|1f1|1hl0g|15rs|li5a|ne:j64lol|1
George Town|george town||KY||3ak|44ro|-hfjo|ne:j64isx|1
Georgetown|georgetown||GY|hw|5nz2|1ghg|-cgti|ne:j64mbd|1
Georgetown|georgetown|janjanbureh|GM|10q|2rk|2wk6|-35xy|ne:j63xw7|1
Georgetown|georgetown||AU|1fn|mq|-3x7c|urid|ne:j64k6h|1
Georgievsk|georgievsk|georgiyevsk|RU|1mx|1k21|9gqn|9bez|ne:j6459f|1
Gera|gera||DE|1qd|28r7|awio|2l4s|ne:j64ell|1
Geraldton|geraldton||AU|1ve|l16|-65yq|ok9c|ne:j64m5n|1
Geraldton|geraldton|greenstone|CA|1av|zu|anm6|-in1e|ne:j647k7|1
Ghadamis|ghadamis|ghadames|LY|ku|53z|6gid|21aw|ne:j64ks1|0
Ghanzi|ghanzi||BW|kv|4v6|-4nfo|4mz4|ne:j64ha7|1
Ghardaia|ghardaia||DZ|kx|2otk|6yp0|sbg|ne:j64mqx|1
Gharyan|gharyan||LY|14d|35a2|6w88|2sgo|ne:j64dd5|1
Ghat|ghat||LY|ky|isb|5cmn|26hs|ne:j64ksb|1
Ghaziabad|ghaziabad||IN|1sy|sqq0|655r|gl9s|ne:j64l85|1
Ghazni|ghazni||AF|kz|30so|76z5|enwy|ne:j64hpl|1
Gibraltar|gibraltar||GI|l2|40cr|7qss|-15hx|ne:j64j0d|0
Gießen|giessen||DE|oc|1rjq|aub1|1uqs|ne:j64ekv|1
Gifu|gifu||JP|l3|8ulb|7lbr|tb9o|ne:j64f47|1
Gijón|gijon||ES|1et|778k|9bvo|-17r0|ne:j644a7|1
Gikongoro|gikongoro||RW|1mm|bko|-j5t|6c4z|ne:j63u9f|1
Gila Bend|gila bend||US|48|1m0|728w|-o5sf|ne:j648f5|1
Gilgit|gilgit||PK|19e|4n94|7p4z|fxaw|ne:j64bdl|1
Gillam|gillam||CA|121|zl|c2ss|-kapk|ne:j64k1f|1
Gillette|gillette||US|1vp|mgp|9how|-mm30|ne:j648nf|1
Gimbi|gimbi||ET|g|ojl|1yqe|7ohp|ne:j64fyp|1
Gimli|gimli||CA|121|20v|auot|-ksgg|ne:j647h3|1
Gingin|gingin||AU|1ve|146|-6pw8|ouag|ne:j64i8t|1
Gingoog|gingoog||PH|146|62|1w4w|qtic|ne:j64clv|1
Girardot|girardot||CO|fh|2sj5|x98|-g18k|ne:j646d7|1
Giresun|giresun||TR|l5|24a8|8roq|887w|ne:j63tpn|1
Girga|girga||EG|1ne|2qyi|5n60|6tzk|ne:j64ehz|1
Gisborne|gisborne||NZ|l6|qgs|-8abt|125lh|ne:j64n5f|1
Gisenyi|gisenyi||RW|1vd|1siv|-czz|69sl|ne:j64avn|0
Gitarama|gitarama|muhanga|RW|1mm|1vlp|-fyw|6dmo|ne:j64avf|1
Gitega|gitega||BI|15o|hvj|-qfo|6e9w|ne:j64is1|1
Giurgiu|giurgiu||RO|l7|1haj|9eys|5jds|ne:j63ucd|1
Giyon|giyon|waliso|ET|g|2gdi|1ttk|84z8|ne:j64fxz|1
Giza|giza|el giza|EG|1l|1lhc7|6fk4|6onw|ne:j64jib|1
Gizo|gizo||SB|ds|4qy|-1qhw|xm5a|ne:j64bpl|1
Gjirokastër|gjirokaster||AL|l8|i31|8l92|4bgy|ne:j63yvj|1
Gjoa Haven|gjoa haven||CA|19z|ut|epkt|-kk3j|ne:j64kzt|1
Gjøvik|gjovik||NO|1ax|hj3|d14w|2ak8|ne:j6451z|1
Gladstone|gladstone||AU|1fn|nix|-541x|wf0z|ne:j64k6x|1
Glarus|glarus||CH|l9|4dt|a31g|1xyj|ne:j63ujl|1
Glasgow|glasgow||GB|la|ov28|bz58|-wtb|ne:j64mbj|1
Glasgow|glasgow||US|14o|2i0|absg|-musx|ne:j648ch|1
Glazov|glazov||RU|1sa|25ok|cghc|ba34|ne:j64cbf|1
Glendale|glendale||US|48|apsw|774b|-o1pi|ne:j641an|1
Glendive|glendive||US|14o|4io|a3hq|-mfy9|ne:j64177|1
Glenwood Springs|glenwood springs||US|ek|at0|8h56|-n04f|ne:j641gf|1
Gliwice|gliwice||PL|1l3|avpy|asco|4024|ne:j64dfv|1
Goba|goba||ET|g|qip|1i38|8kes|ne:j64kt7|1
Gobabis|gobabis||NA|1as|cld|-4t9i|42bi|ne:j63wa3|1
Gobernador Gregores|gobernador gregores||AR|1j8|1xz|-agaa|-f21w|ne:j647oz|1
Gode|gode||ET|1lr|1lvc|19ws|9b9g|ne:j64kth|1
Gogrial|gogrial||SS|1uu|12mp|1tuh|60y7|ne:j64a9l|1
Goiana|goiana||BR|1d4|1j7h|-1mbw|-7i28|ne:j64hkl|1
Goianésia|goianesia||BR|le|10y3|-3a4o|-aj38|ne:j64hcz|1
Goiânia|goiania||BR|le|17c6o|-3kzx|-akf0|ne:j64mzn|1
Gold Coast|gold coast||AU|1fn|bb58|-60of|ww0i|ne:j64m6l|1
Goldsboro|goldsboro||US|18z|10qa|7l17|-gpsr|ne:j64935|1
Golela|golela||SZ|1kp|2un|-5uma|6u54|ne:j64a6f|0
Golfito|golfito||CR|1f4|589|1uqs|-htl8|ne:j646bx|1
Golmud|golmud||CN|kg|2ams|7szq|kc4h|ne:j64loz|1
Golyshmanovo|golyshmanovo||RU|1s3|acw|c31n|enk3|ne:j64cfj|1
Goma|goma|gisenyi|CD|18o|337g|-cyc|69h6|ne:j64lut|1
Gombe|gombe||NG|lh|5sm6|27eg|2e6s|ne:j64d9p|1
Gómez Palacio|gomez palacio||MX|hp|8k4g|5hat|-m6m0|ne:j645rz|1
Gonaïves|gonaives||HT|x8|3kly|462w|-fkts|ne:j64abh|1
Gonbad-e Kavus|gonbad e kavus||IR|lg|3ffy|7zfq|btpf|ne:j64g5d|1
Gondar|gondar|gonder|ET|2r|3cjq|2pas|811k|ne:j64mlv|1
Goodland|goodland||US|t2|3dm|8fm5|-lst2|ne:j641rd|1
Goodnews Bay|goodnews bay||US|26|6e|co6i|-ymtb|ne:j643n7|1
Goondiwindi|goondiwindi||AU|17q|3a3|-64bw|w7x1|ne:j64k5h|1
Gorakhpur|gorakhpur||IN|1sy|eg92|5qeo|hvd4|ne:j64jst|1
Goranboy|goranboy||AZ|li|5np|8pcn|a115|ne:j63z1x|1
Gore|gore||NZ|1mr|7iu|-9vo3|107pg|ne:j64n6z|1
Gore|gore||ET|g|77s|1qvm|7m7e|ne:j640p5|1
Gorgan|gorgan||IR|lg|60u7|7w6n|bodc|ne:j64g5j|1
Gorno Altaysk|gorno altaysk||RU|ll|1a70|b4xp|if95|ne:j64j85|1
Gornyak|gornyak||RU|2h|c38|axfd|hgrh|ne:j64cgd|0
Goroka|goroka||PG|i5|umr|-1axt|v5sv|ne:j64lh3|1
Gorom Gorom|gorom gorom||BF|1bp|55v|33hw|-1st|ne:j63ztp|1
Gorontalo|gorontalo||ID|ln|7u0p|48s|qdm4|ne:j64ltd|1
Göteborg|goteborg|gothenburg|SE|1uo|biyt|cdlo|2klc|ne:j64kil|1
Göttingen|gottingen||DE|182|2zkr|b1j8|24jk|ne:j64elh|1
Goulburn|goulburn||AU|17q|g5o|-7g4o|w366|ne:j64ibh|1
Goulimine|goulimine|guelmim|MA|ml|2gxv|67m0|-25p8|ne:j64kin|1
Goundam|goundam||ML|1qj|6iw|3ioa|-sai|ne:j64ct1|1
Gouré|goure||NE|1xa|ban|2zxe|278s|ne:j64awf|1
Governador Valadares|governador valadares||BR|141|5dku|-41lo|-8zuc|ne:j64k0d|1
Govorovo|govorovo||RU|1hy|q7|f1r6|r065|ne:j64jch|1
Goya|goya||AR|f4|1jsg|-68ug|-cpbw|ne:j64k37|1
Goyang|goyang|koyang|KR|mv|jcrc|82jn|r6o1|ne:j64ish|1
Goycay|goycay|goychay|AZ|mz|r9w|8pom|a8da|ne:j64hoh|1
Graaff Reinet|graaff reinet||ZA|i3|1cj4|-6x88|59co|ne:j64kdj|1
Gracias|gracias||HN|yk|63p|34ix|-izih|ne:j63tit|1
Grafton|grafton||AU|17q|7oj|-6d9c|ws2p|ne:j64k5d|1
Grahamstown|grahamstown|makhanda|ZA|i3|1yn0|-74xw|5omo|ne:j64buj|1
Grajau|grajau||BR|12b|nbd|-18tw|-9w3g|ne:j6473x|1
Gramsh|gramsh||AL|ij|8x0|8rbv|4bv4|ne:j63ytd|1
Granada‎|granada||ES|31|8blu|7yrm|-rnu|ne:j64j0b|1
Granada‎|granada||NI|lv|296r|2k2x|-if70|ne:j64b55|1
Grand Bassam|grand bassam||CI|xx|1kx8|144k|-sxo|ne:j64gkp|1
Grand Canyon|grand canyon|grand canyon village|US|48|172|7q78|-o19m|ne:j648ft|1
Grand Forks|grand forks||US|190|196u|a9sl|-ksph|ne:j64ix7|1
Grand Island|grand island||US|17a|z83|8rrb|-l2xo|ne:j641sz|1
Grand Junction|grand junction||US|ek|28eu|8dnf|-n9ks|ne:j64ixl|1
Grand Prairie|grand prairie|grande prairie|CA|29|vzq|bto2|-pgo0|ne:j64kz7|1
Grand Rapids|grand rapids||US|13u|bhg5|97id|-id17|ne:j649bd|1
Grand Turk|grand turk|cockburn town|TC||4h5|4lmw|-f8w0|ne:j64isz|1
Granja|granja||BR|ca|jyv|-o2j|-8r4g|ne:j64gu5|1
Grants Pass|grants pass||US|1b3|zn1|93gr|-qflk|ne:j648ln|1
Graz|graz||AT|1my|5n42|a396|3awk|ne:j64i2j|1
Great Falls|great falls||US|14o|1fcu|a6ij|-nuso|ne:j64l8x|1
Great Wall Station|great wall station||AQ||14|-dc2b|-cmzn|ne:j64iul|1
Greeley|greeley||US|ek|2orm|8nvk|-mg6g|ne:j641hb|1
Green Bay|green bay||US|1vm|498z|9jlg|-iv0g|ne:j64izx|1
Green River|green river||US|1vp|8ri|8wbu|-ngmy|ne:j648n3|1
Greenock|greenock||GB|q9|1ll7|bzl1|-10ng|ne:j644bd|1
Greensboro|greensboro||US|18z|8c2f|7qbg|-h3qo|ne:j64izn|1
Greenville|greenville||US|1m7|7isq|7gxd|-hnra|ne:j6490p|1
Greenville|greenville||US|18z|1zf9|7msh|-gkyr|ne:j64937|1
Greenville|greenville||US|149|tej|75so|-jimx|ne:j6490d|1
Greenville|greenville||LR|1l9|806|12nz|-1xqs|ne:j64kjj|1
Grenoble|grenoble||FR|1gg|8btq|9om4|184w|ne:j64e31|1
Grevenmacher|grevenmacher||LU|m6|31y|anhk|1cv9|ne:j63wpj|0
Greymouth|greymouth||NZ|1v4|7sk|-93po|10p5z|ne:j64n4f|1
Griffith|griffith||AU|17q|bxb|-7cl0|vauo|ne:j64m5p|1
Grise Fiord|grise fiord||CA|19z|n|gdtt|-hs1o|ne:j64kzv|1
Groningen|groningen||NL|m7|4n74|beng|1ers|ne:j64bav|1
Groningen|groningen||SR|1jj|2hc|18qa|-bw3e|ne:j640dn|1
Grootfontein|grootfontein||NA|1bk|ilf|-46z6|3vse|ne:j64mgz|1
Grozny|grozny|groznyy|RU|d1|4ugk|9a8z|9sm3|ne:j64ljn|1
Grudziądz|grudziadz||PL|wr|271n|bgno|40oc|ne:j64dfh|1
Gryazi|gryazi||RU|z8|10l1|b91w|8k4v|ne:j64c1h|1
Grytviken|grytviken||GS||2r|-bmty|-7tp4|ne:j64ist|1
Guadalajara|guadalajara||MX|qz|2hz74|4fi8|-m5bc|ne:j64mv1|1
Guadalajara|guadalajara||ES|c4|1k7m|8pj5|-ofm|ne:j649d3|1
Guaira|guaira|salto del guaira|BR|1ch|s3u|-55vo|-bmr0|ne:j647al|1
Guajara-Miram|guajara miram|guajara mirim|BR|1gy|1hoy|-2bc0|-e08r|ne:j64k05|1
Gualeguay|gualeguay||AR|in|pk0|-73sc|-cpvc|ne:j647y5|1
Gualeguaychú|gualeguaychu||AR|in|1opg|-72s8|-cjjk|ne:j64l2l|1
Guamúchil|guamuchil||MX|1l5|1cdj|5gj4|-n610|ne:j64cuz|1
Guanajuato|guanajuato|guanajuato city|MX|md|2eko|4i70|-lphc|ne:j64d11|1
Guanambi|guanambi||BR|60|19fh|-31so|-9664|ne:j64gvx|1
Guanare|guanare||VE|1ee|390a|1xtw|-ey70|ne:j6427z|1
Guangshui|guangshui||CN|p6|3bf7|6rzg|ofmo|ne:j64eqh|1
Guangyuan|guangyuan||CN|1kv|9diz|6y8c|mowc|ne:j64jkf|1
Guangzhou|guangzhou|dongguan guangdong|CN|me|598i0|4ylp|oaen|ne:j64mw3|1
Guanhães|guanhaes||BR|141|ib3|-40wo|-97ek|ne:j6475t|1
Guantánamo|guantanamo||CU|mg|5uht|4bfx|-g4al|ne:j64jhn|1
Guapi|guapi||CO|c7|aot|jr8|-gors|ne:j64e93|1
Guaranda|guaranda||EC|8y|li2|-cf8|-gxn8|ne:j646ap|1
Guarapuava|guarapuava||BR|1ch|38ea|-5fu0|-b180|ne:j647b7|1
Guaratinguetá|guaratingueta||BR|1o6|4d30|-4w2w|-9oos|ne:j647zt|1
Guarda|guarda||PT|mh|orz|8ote|-1k18|ne:j63vhx|1
Guasave|guasave|guasave city|MX|1l5|22qk|5hax|-n8yk|ne:j64cv3|1
Guasdualito|guasdualito||VE|3n|nt8|1jv4|-f5u0|ne:j64263|1
Guatemala City|guatemala city|ciudad de guatemala guatemala city,guatemala|GT|mi|ly4g|34tz|-jeix|ne:j64mkd|1
Guaxupé|guaxupe||BR|141|10y9|-4k9w|-a0ez|ne:j64773|1
Guayaquil|guayaquil||EC|mj|1hvtc|-h45|-h4ok|ne:j64mwd|1
Guayaramerín|guayaramerin||BO|id|rs8|-2bkc|-e0pg|ne:j647qz|1
Guaymas|guaymas||MX|1lw|27tl|5zic|-nrms|ne:j64lm1|1
Gubakha|gubakha||RU|1d3|o8w|cm8j|cccv|ne:j64dh1|1
Gubkin|gubkin||RU|7q|7k|azmw|80gj|ne:j645fz|1
Gueckedou|gueckedou|gueckedougou|GN|1a4|4r2r|1u04|-26bq|ne:j63yih|1
Guelma|guelma||DZ|mk|2nd2|7tdg|1lbc|ne:j63zin|1
Gueppi|gueppi||PE|zn|a|-we|-g4h8|ne:j64k9j|1
Guerrero Negro|guerrero negro||MX|63|a2m|5zz4|-ogxw|ne:j64ctv|1
Guide|guide||CN|kg|5wa|7q4j|lqle|ne:j64dv5|1
Guider|guider||CM|18m|1tbb|24mg|2zk8|ne:j64hnb|1
Guiglo|guiglo||CI|15b|u72|1ejl|-1lsk|ne:j64gkz|1
Guilin|guilin||CN|mf|l5ko|5f2r|nmwt|ne:j64mhx|1
Güines|guines||CU|xf|1h6v|4w7d|-hkxk|ne:j646ez|1
Guiyang|guiyang||CN|mp|26hm8|5p3w|mvfx|ne:j64mvx|1
Gujranwala|gujranwala||PK|1f3|wffs|6w60|fwef|ne:j64l6p|1
Gujrat|gujrat||PK|1f3|6gn6|6ze0|fvls|ne:j6454z|1
Gulfport|gulfport||US|149|1red|6ibg|-j3g0|ne:j648zz|1
Guliston|guliston|gulistan|UZ|1lc|21pc|8ogt|eqsj|ne:j64477|1
Gulkana|gulkana||US|26|3b|dchm|-v5ry|ne:j643sv|1
Gulu|gulu||UG|4s|35be|lg8|6x2o|ne:j64ldz|1
Gümüşhane|gumushane||TR|n0|ovu|8o80|8gns|ne:j63tu5|1
Gunnedah|gunnedah||AU|17q|5ik|-6n3i|w7fj|ne:j64id5|1
Gunnison|gunnison||US|ek|5ng|89ew|-mx2b|ne:j648jf|1
Gunsan|gunsan||KR|rb|58c0|7pmy|r5qw|ne:j64cjv|1
Guntur|guntur||IN|33|bde9|3i04|h8r8|ne:j64kq1|1
Gurgaon|gurgaon|gurugram|IN|nr|489o|63is|giag|ne:j646rh|1
Gurupi|gurupi||BR|1qs|1dzp|-2ifg|-aijs|ne:j64gp7|1
Guryevsk|guryevsk||RU|uc|twl|bmyt|if3l|ne:j64cgv|1
Gusau|gusau||NG|1wx|4v1l|2lwo|1fe0|ne:j64db1|1
Gusinoozyorsk|gusinoozyorsk||RU|ah|ikz|azoo|mtrg|ne:j64coj|1
Guwahati|guwahati|dispur,gauhati|IN|4o|l2hk|5lv8|jo34|ne:j64lvx|1
Guymon|guymon||US|1ao|8mi|7v2i|-lr0r|ne:j648rn|1
Gwadar|gwadar||PK|6d|141p|5dz2|dcxi|ne:j64bdd|1
Gwalior|gwalior||IN|10u|kymo|5men|gr85|ne:j64l8h|1
Gwanda|gwanda||ZW|131|b5e|-4hkk|67uc|ne:j64a5l|1
Gwangju|gwangju|kwangju|KR|wu|uv40|7je9|r78d|ne:j64ljx|1
Gweru|gweru||ZW|13x|3xha|-462s|6e3c|ne:j64jzt|1
Gyangze|gyangze|gyantse|CN|1vt|7ps|67do|j7m5|ne:j646j1|1
Gyda|gyda||RU|1vz|a|f6xa|gtg5|ne:j64j6z|1
Gyeongju|gyeongju||KR|fr|3bs5|7okc|rp05|ne:j644kd|1
Gympie|gympie||AU|1fn|8zl|-5m2m|wq0l|ne:j64ikf|1
Győr|gyor||HU|mx|2x01|a824|3s18|ne:j64amx|1
Gyumri|gyumri||AM|1ko|36hp|8qqe|9ebv|ne:j6483b|1
Ha Giang|ha giang||VN|pg|tlm|4w6p|mi21|ne:j64a1z|1
Hà Tĩnh|ha tinh||VN|n3|3jmc|3xgq|mp4o|ne:j649z7|1
Haapsalu|haapsalu||EE|10i|93x|cmt3|51na|ne:j63xbp|1
Haarlem|haarlem||NL|18l|7i11|b864|zq4|ne:j64bqf|1
Hachinohe|hachinohe||JP|3j|54g6|8oks|uc4o|ne:j64jon|1
Hachiōji|hachioji||JP|1qx|cf2f|7n4x|tv1p|ne:j646pz|1
Hadiboh|hadiboh|hadibu|YE|n9|8sk|2pmf|bkun|ne:j649q3|1
Haeju|haeju||KP|pe|4t0n|85ii|qy0o|ne:j64dib|1
Hafar al Batin|hafar al batin|hafar al batin governorate|SA|4k|5ca2|63e9|9ump|ne:j64bd5|1
Hagere Hiywet|hagere hiywet|ambo|ET|g|xw0|1xak|841w|ne:j64fy3|1
Hagerstown|hagerstown||US|12o|1pgu|8hvk|-gnoz|ne:j64331|1
Hai Duong|hai duong||VN|n2|18ry|4hl8|msge|ne:j63tcx|1
Haifa|haifa|hefa|IL|na|lo3c|719c|7hw5|ne:j64fwp|1
Haikou|haikou||CN|nb|17uul|4apg|nn8g|ne:j64jj5|1
Hail|hail|ha il,saudi arabia|SA|n4|899l|5wdg|8xrd|ne:j64b87|1
Hailar|hailar||CN|17d|4ydf|ajmo|pnm0|ne:j64ltn|1
Hailun|hailun||CN|o5|2cs9|a64o|r7ec|ne:j64f2l|1
Haiphong|haiphong|hai phnng|VN|1fl|167ag|4gqo|mv4t|ne:j64ld1|1
Haiya|haiya|hayya|SD|1ga|ffk|3xhe|7sqq|ne:j649gt|1
Hajjah|hajjah||YE|ne|4gpr|3d2t|9cfp|ne:j649h3|1
Hakha|hakha|haka|MM|dh|ffk|4uro|k2cn|ne:j6403d|1
Hakkâri|hakkari||TR|nf|1nyb|81xc|9di8|ne:j644nl|1
Hakodate|hakodate||JP|oo|6hs8|8yhq|u5yg|ne:j64lu5|1
Halachó|halacho||MX|1wg|72l|4e0w|-jb28|ne:j6460f|1
Haldia|haldia||IN|1v3|4awq|4py9|ivgn|ne:j64gcj|1
Half Way Tree|half way tree|halfway tree|JM|1hn|22ge|3v59|-gglc|ne:j63x33|1
Halifax|halifax||CA|19o|7p3b|9kis|-dmqo|ne:j64mot|1
Hall Beach|hall beach|sanirajak|CA|19z|i6|eqm3|-hetl|ne:j647j7|1
Halley Station|halley station|halley research station|AQ||1y|-gb4r|-5o9y|ne:j64ivv|1
Halls Creek|halls creek||AU|1ve|xl|-3wy3|rdur|ne:j64k45|1
Halmstad|halmstad||SE|ng|16y1|c5a6|2r70|ne:j649m3|1
Hamadan|hamadan||IR|nh|bbls|7ghk|aece|ne:j64lyt|1
Hamah|hamah|hama|SY|ni|9vei|7j7z|7ves|ne:j649fx|1
Hamamatsu|hamamatsu||JP|1kq|kxvj|7fvx|tir3|ne:j64f4n|1
Hamar|hamar||NO|o4|mqv|d1ag|2deq|ne:j63vq7|1
Hamburg|hamburg||DE|nj|11npk|bh7k|2559|ne:j64mwp|1
Hämeenlinna|hameenlinna||FI|1po|10gt|d2nm|58ts|ne:j63y4z|1
Hamhung|hamhung||KP|nl|gkg8|8jyo|rc4r|ne:j64jf3|1
Hami|hami|yizhou|CN|1vs|cfj4|96ge|k1ke|ne:j64mjl|1
Hamilton|hamilton||CA|1av|fgd9|99pw|-h3z0|ne:j64k23|1
Hamilton|hamilton||NZ|1uq|36co|-83hz|11kjk|ne:j64n63|1
Hamilton|hamilton||BM||14dc|6x6m|-dvvj|ne:j64ms1|1
Hamilton|hamilton||AU|1tx|6ud|-834w|ufuy|ne:j64ign|1
Hammerfest|hammerfest||NO|jm|7ps|f585|52s0|ne:j64lgb|1
Hampton|hampton||US|1u5|7uzy|7xq4|-gd4c|ne:j642xt|1
Hancheng|hancheng||CN|1k8|4ref|7low|no30|ne:j64epl|1
Hancock|hancock||US|13u|cmb|a3mx|-izhs|ne:j649c7|1
Handan|handan||CN|o3|yyhk|7u9n|ojbg|ne:j64lsl|1
Hanggin Houqi|hanggin houqi|hanggin rear banner|CN|17d|utu|8rgv|myp4|ne:j646nx|1
Hangu|hangu|lunan|CN|1qe|74s9|8eps|p8ru|ne:j646ld|1
Hangzhou|hangzhou||CN|1x7|1sg7s|6hfb|pr81|ne:j64mxn|1
Hania|hania|chania|GR|wd|1oqw|7m0i|55b0|ne:j646yv|1
Hanoi|hanoi|h|VN|1qc|2lu34|4ib5|moq9|ne:j64mtv|1
Hanover|hanover|hannover|DE|182|fhh6|b82e|22z3|ne:j64eld|1
Hanzhong|hanzhong||CN|1k8|34n6|73ms|mxuk|ne:j64jj7|1
Haora|haora|howrah|IN|1v3|2vrty|4u8c|ixk3|ne:j64gcb|1
Happy Valley - Goose Bay|happy valley goose bay||CA|17t|5uc|bf9k|-cxa0|ne:j647od|1
Hapur|hapur||IN|1sy|57fs|65sd|go0s|ne:j6472z|1
Harar|harar|harar jugol|ET|g|3r0y|1zww|918c|ne:j64kt5|1
Harare|harare||ZW|nn|xoyo|-3tgu|6nj0|ne:j64mb1|1
Harbin|harbin|haerbin|CN|o5|25lzc|9t0v|r580|ne:j64mxx|1
Hardin|hardin||US|14o|3fk|9sva|-n2cd|ne:j6416t|1
Hargeisa|hargeisa|hargeysa|||a8qc|21rk|9g0d|ne:j64ms5|1
Harlingen|harlingen||US|1q4|2d4z|5m54|-kxs6|ne:j641zx|1
Härnösand|harnosand||SE|1um|d4o|dfac|3udo|ne:j63unh|1
Harper|harper||LR|12o|p79|xre|-1njm|ne:j64b73|1
Harrisburg|harrisburg||US|1cy|bc3g|8mr4|-gh8v|ne:j64jwt|1
Harrisonburg|harrisonburg||US|1u5|wtm|88oe|-gwk4|ne:j642x1|1
Harstad|harstad||NO|1rp|ezt|eqrr|3jfo|ne:j64baz|1
Hartford|hartford||US|et|jkh4|8ybc|-fktf|ne:j64iz3|1
Hasselt|hasselt||BE|z2|1heu|ax8o|16bc|ne:j63yz7|1
Hassi Messaoud|hassi messaoud||DZ|1bn|dzg|6sm7|1apt|ne:j64hzx|1
Hastings|hastings||NZ|l6|1f04|-8hum|11whc|ne:j64n5d|1
Hat Yai|hat yai||TH|1lu|6tc2|1hzg|lj8q|ne:j64k8n|1
Hathras|hathras||IN|1sy|2pwi|5wyo|gq8k|ne:j64723|1
Hato Mayor|hato mayor|hato mayor del rey|DO|nv|rrz|40s8|-eue2|ne:j63xsh|1
Hattiesburg|hattiesburg||US|149|19fe|6pq1|-j4yu|ne:j64903|1
Haugesund|haugesund||NO|1gv|v41|cqfb|14pz|ne:j64j47|1
Havana|havana|la habana|CU|e7|1algw|4yi3|-hnjh|ne:j64mwj|1
Havre|havre||US|14o|8lu|aeks|-nia1|ne:j64jtd|1
Hawalli|hawalli||KW|o2|3ipg|6ac5|aadc|ne:j63xc7|1
Hawera|hawera||NZ|1pa|8kc|-8heb|11cqk|ne:j64n6t|1
Hay River|hay river||CA|19k|30c|d1is|-osqw|ne:j647jj|1
Hays|hays||US|t2|gia|8bzu|-ladi|ne:j641r1|1
Hearst|hearst||CA|1av|3w3|anhp|-hxkq|ne:j64h3b|1
Hebi|hebi||CN|o6|58s6|7pe8|ohbs|ne:j64eu1|1
Hechi|hechi||CN|mf|2a38w|5ajt|n5z2|ne:j64dvt|1
Hefei|hefei||CN|36|17m7s|6trs|p4x9|ne:j64lpd|1
Hegang|hegang||CN|o5|fxjf|a5qo|rxxw|ne:j64jnx|1
Heidelberg|heidelberg||DE|5s|955q|albs|1v4o|ne:j646g3|1
Heihe|heihe||CN|o5|2cfn|arqc|rbdo|ne:j64jnp|1
Helena|helena||US|14o|tvp|9zif|-o0gx|ne:j64m87|1
Helong|helong||CN|rj|1u64|9478|rnek|ne:j64ezf|1
Helsingborg|helsingborg||SE|1li|1yg8|c0hl|2pzs|ne:j64aup|1
Helsinki|helsinki||FI|1mn|nwc8|cwbz|5cdm|ne:j64myj|1
Hengshui|hengshui||CN|o3|9s4k|831s|osqw|ne:j646kj|1
Hengyang|hengyang||CN|p9|lry8|5rf8|o4qh|ne:j64ls7|1
Herat|herat||AF|ok|ab5d|7cw4|dbpg|ne:j64m3z|1
Heredia|heredia||CR|o8|gxn|253k|-i12o|ne:j640jn|1
Hereford|hereford||US|1q4|c3f|7gor|-ly42|ne:j6423v|1
Herisau|herisau||CH|3k|bwu|a5m1|1zmp|ne:j63ui3|1
Hermanus|hermanus||ZA|1vf|jep|-7di8|44dn|ne:j64biz|1
Hermosillo|hermosillo||MX|1lw|crqb|68j1|-ns4l|ne:j64llz|1
Hervey Bay|hervey bay||AU|1fn|jdm|-5f4n|wrbt|ne:j64im5|1
Hetauda|hetauda||NP|16y|4z9q|5vjr|i84e|ne:j6457n|1
Heyuan|heyuan||CN|me|73dd|533s|okvk|ne:j64dy3|1
Heze|heze||CN|1ke|soeo|7jun|oqsx|ne:j64jm7|1
Hickory|hickory||US|18z|1x12|7npz|-hfmu|ne:j6493d|1
Hidalgo del Parral|hidalgo del parral||MX|dd|27rm|5rti|-mnbu|ne:j645rl|1
Higuey|higuey|salvaleon de higuey|DO|xb|2nij|3zn4|-eq5k|ne:j63xvv|1
Hilf|hilf|dawwah|OM|4k|6k4|4fdu|cmao|ne:j6488n|1
Hillerød|hillerod||DK|ox|luh|bzl1|2n1b|ne:j63ybt|1
Hilo|hilo||US|o1|14fb|4808|-x8ok|ne:j64l95|1
Hinche|hinche||HT|cg|ece|43pi|-ffl4|ne:j63tkz|1
Hindupur|hindupur||IN|33|3lvc|2ybw|glx0|ne:j64fhv|1
Hinthada|hinthada||MM|5e|3vg8|3s6b|kgmv|ne:j64iqz|1
Hinton|hinton||CA|29|7x5|bg1c|-p7a1|ne:j647hz|1
Hios|hios|chios|GR|1uf|kqz|881t|5lny|ne:j64fuv|1
Hirosaki|hirosaki||JP|3j|3r0c|8p1g|u3vg|ne:j64jol|1
Hiroshima|hiroshima||JP|ol|17txk|7dcq|sdx6|ne:j64mxp|1
Hisar|hisar||IN|nr|boe5|692s|g8aq|ne:j646rv|1
Hlatikulu|hlatikulu||SZ|1kp|24c|-5sc0|6qev|ne:j63vah|1
Hlotse|hlotse||LS|yn|10sb|-66to|60hc|ne:j63wtl|1
Ho|ho||GH|1uc|1zsk|1exg|3mk|ne:j64ffj|1
Ho Chi Minh City|ho chi minh city|th nh pho ho chy minh|VN|n1|35wb4|2b70|mv8z|ne:j64mtx|1
Hoa Binh|hoa binh||VN|pi|297w|4gll|mksn|ne:j649yh|1
Hobart|hobart||AU|1pl|1qee|-96ms|vkja|ne:j64mrn|1
Hobbs|hobbs||US|17p|m6a|70eu|-m3u6|ne:j648kn|1
Hodrogo|hodrogo||MN|ht|a|ahts|kqs9|ne:j64djf|1
Hof|hof||DE|7k|17bt|as8y|2jy7|ne:j64emv|1
Höfn|hofn||IS|1ny|1b3|drxf|-39e3|ne:j64j1t|1
Hofuf|hofuf|al hufuf|SA|4k|dnt9|5flb|amls|ne:j64j4n|1
Hohenau|hohenau||PY|qp|43e|-5sy3|-by64|ne:j64b51|1
Hohhot|hohhot|huhot|CN|17d|10zsg|8qzf|nxk5|ne:j64lth|1
Hokitika|hokitika||NZ|1v4|2di|-95j4|10nis|ne:j64n53|1
Holguín|holguin||CU|op|6u7y|4h60|-gcg7|ne:j64jhp|1
Holman|holman|ulukhaktok|CA|19k|dw|f5s6|-p8kc|ne:j64k1t|1
Homer|homer||US|26|528|cs7h|-whcr|ne:j649kx|1
Homestead|homestead||US|jp|1ubz|5gij|-h8yy|ne:j642cz|1
Homs|homs|hims|SY|oq|ljgo|7fzr|7vbh|ne:j64k7z|1
Homyel|homyel|gomel|BY|or|ab3r|b8jw|6n74|ne:j64k3v|1
Hon Quan|hon quan||VN|5n|v2v|2hw8|muj4|ne:j649zt|1
Honda|honda||CO|1r0|rd9|141r|-g0rw|ne:j64e8p|1
Hong Gai|hong gai|ha long,hon gai|VN|1fl|3pf7|4hqc|mye0|ne:j649wd|1
Hong Kong|hong kong||HK||4ag6o|4s4d|oh1j|ne:j64n4d|1
Honiara|honiara||SB|m8|1mw8|-20to|ya6i|ne:j64mdl|1
Honolulu|honolulu||US|o1|guhc|4kf4|-xu1z|ne:j64mt1|1
Hoonah|hoonah||US|26|a1|cgf6|-t11u|ne:j649hv|1
Hooper Bay|hooper bay||US|26|tz|d6rz|-zlly|ne:j64jxp|1
Hopedale|hopedale||CA|17t|ca|bvus|-cwmv|ne:j647o7|1
Hopkinsville|hopkinsville||US|uf|rh0|7wgf|-ir2e|ne:j642qt|1
Horlivka|horlivka||UA|h9|8i8l|acok|85mr|ne:j6440v|1
Horqueta|horqueta||PY|es|ch7|-5038|-c878|ne:j64b3v|1
Horsham|horsham||AU|1tx|9we|-7v94|uh58|ne:j64ih5|1
Horta|horta||PT|5g|53n|89c3|-650w|ne:j64b5j|1
Hosaina|hosaina|hosaena|ET|1mp|1wwk|1m9c|841w|ne:j64fxp|1
Hosapete|hosapete|hospet|IN|th|64on|39wk|gdba|ne:j64fkd|1
Hoshiarpur|hoshiarpur||IN|1f3|3e0u|6r7k|ga9k|ne:j6471x|1
Hoskins|hoskins||PG|1v9|o7|-168q|w8kk|ne:j64bqb|1
Hot Springs|hot springs||US|49|y3a|7e8g|-jy0m|ne:j648nn|1
Hotan|hotan||CN|1vs|8ri6|7y9h|h4px|ne:j64mjn|1
Houlton|houlton||US|11d|567|9vwn|-ejgd|ne:j643bf|1
Houma|houma||CN|1kg|270g|7mug|nu3o|ne:j64ls3|1
Houma|houma||US|zy|1du8|6cd3|-jfzv|ne:j648sf|1
Houston|houston||US|1q4|2nkl4|6e3v|-kfnv|ne:j64n0d|1
Hradec Králové|hradec kralove||CZ|wf|21gb|are4|3e08|ne:j640mj|1
Hrodna|hrodna|grodno|BY|oy|6svp|bi6j|53wl|ne:j64i41|1
Hsinchu|hsinchu||TW|p0|g2pc|5bhk|pxgn|ne:j64iwv|1
Hua Hin|hua hin||TH|1ej|12xk|2ozl|lf6b|ne:j649vv|1
Huacho|huacho||PE|z0|1q3e|-2dq4|-gmx3|ne:j644wj|1
Huaibei|huaibei||CN|36|jkh4|79z7|p0u1|ne:j64jgp|1
Huainan|huainan||CN|36|v3lk|6zsf|p2lw|ne:j64mhz|1
Huaiyin|huaiyin|huai an|CN|re|r3b4|774b|pifc|ne:j64lsx|1
Huajuapan de León|huajuapan de leon||MX|1a6|10x0|3tfc|-kyjw|ne:j64d0b|1
Hualien|hualien|hualien city|TW|p3|7if8|5525|q29s|ne:j64l67|1
Huamachuco|huamachuco||PE|xg|nsj|-1o9g|-gq8j|ne:j644uj|1
Huambo|huambo||AO|p4|nkrk|-2qd4|3dl9|ne:j64mqj|1
Huancavelica|huancavelica||PE|p5|y90|-2qos|-g2mk|ne:j64k9n|1
Huancayo|huancayo||PE|rt|8ugt|-2l7k|-g48w|ne:j64lf5|1
Huanghua|huanghua||CN|o3|2klc|882g|p5bo|ne:j64et7|1
Huangshi|huangshi||CN|p6|eqxm|6h6g|oo48|ne:j64jjv|1
Huangyan|huangyan||CN|1x7|49bt|652c|pzkk|ne:j646lv|1
Huanren|huanren||CN|ys|2hzh|8uc3|qv6c|ne:j64eut|1
Huanta|huanta||PE|5c|edf|-2rx4|-fwx0|ne:j64b27|1
Huánuco|huanuco||PE|pb|3e0x|-24jk|-gc9s|ne:j64k9d|1
Huaraz|huaraz||PE|30|1v2u|-21j8|-gm84|ne:j64k97|1
Huarmey|huarmey||PE|30|ch8|-25p4|-gr34|ne:j64b07|1
Huasco|huasco||CL|4w|1z2|-63o8|-f9jc|ne:j64frd|1
Huatabampo|huatabampo|huatabampobambo|MX|1lw|nh6|5r0w|-nhws|ne:j64cwd|1
Huaura|huaura||PE|z0|v68|-2dc8|-gmrk|ne:j644wb|1
Hubballi|hubballi|hubli|IN|th|j2q8|3aj7|g3nj|ne:j64lvh|1
Hudson Bay|hudson bay||CA|1jo|1nx|bbso|-lxzt|ne:j64gzb|1
Hudur|hudur|xuddur|SO|66|19j|wa1|9eh7|ne:j63w13|1
Hue|hue||VN|1q5|kd0w|3j30|n23c|ne:j64jz1|1
Huehuetenango|huehuetenango||GT|p7|1uco|3a7o|-jlsc|ne:j64fcb|1
Huelva|huelva||ES|31|338u|7zfc|-1hgz|ne:j649cp|1
Hughenden|hughenden||AU|1fn|bp|-4gvo|uwnk|ne:j64k67|1
Hughes|hughes||US|26|26|e5n0|-x28m|ne:j649jx|1
Huinan|huinan|huinan county|CN|rj|1f63|94vp|r28m|ne:j64eyt|1
Huize|huize||CN|1wj|3zm|5nbk|m5yv|ne:j64esp|1
Huizhou|huizhou||CN|me|675d|4y34|oips|ne:j6469v|1
Hulan Ergi|hulan ergi|fularji|CN|o5|67rj|a49w|qhs4|ne:j646of|1
Hulin|hulin||CN|o5|wu7|9t5m|si6a|ne:j64f3t|1
Humahuaca|humahuaca||AR|rr|8rt|-4z0g|-e08r|ne:j647vx|1
Hun|hun||LY|1m|eke|68nz|3exx|ne:j64ks5|1
Huntington|huntington||US|1vb|1tw4|88g4|-ho5h|ne:j6496b|1
Huntsville|huntsville||US|23|4k59|7fwg|-ikac|ne:j64jv3|1
Huntsville|huntsville||US|1q4|rgm|6l2e|-kh9u|ne:j648th|1
Hurdiyo|hurdiyo||SO|6w|4w|29ng|aygx|ne:j64cil|1
Hurghada|hurghada|al ghurdaqah|EG|15|3das|5u3w|7918|ne:j64knt|1
Hutchinson|hutchinson||US|t2|ybh|85pr|-kzkz|ne:j641p7|1
Huzhou|huzhou||CN|1x7|qdug|6m7n|pqol|ne:j64jmt|1
Hwange|hwange||ZW|130|q85|-3xqs|5oh4|ne:j64jzp|1
Hydaburg|hydaburg||US|26|am|bu18|-sgp2|ne:j643kx|1
Hyderabad|hyderabad||IN|1pw|3snr4|3q9v|gtjg|ne:j64my7|1
Hyderabad|hyderabad||PK|1l6|v9rs|5fuj|enki|ne:j64md5|1
Hyeson|hyeson|hyesan|KP|1h7|4vid|8vdz|rh53|ne:j64djd|1
I-n-Amenas|i n amenas|in amenas|DZ|pv|60|60fr|21os|ne:j64hzf|1
I-n-Salah|i n salah|in salah|DZ|1oy|11zb|5u06|j16|ne:j64l47|1
Iași|iasi||RO|pl|6zh6|a3yb|5wrp|ne:j64lej|1
Ibadan|ibadan||NG|1by|1kbs0|1kyk|ub4|ne:j64lmp|1
Ibagué|ibague||CO|1r0|91dh|y91|-g4hu|ne:j64jhv|1
Ibarra|ibarra||EC|pz|3585|2s4|-gqus|ne:j64e9v|1
Ibb|ibb||YE|pn|5179|2zu7|9gtp|ne:j643jn|1
Ibri|ibri||OM|1a|26fc|4z7i|c436|ne:j64ciz|1
Ica|ica||PE|po|5zlo|-30js|-g8av|ne:j64mcb|1
Icel|icel|mersin|TR|13q|d82m|7vy8|7f4o|ne:j644h3|1
Icó|ico||BR|ca|lur|-1dds|-8bro|ne:j64kxp|1
Idah|idah||NG|vq|1lxr|1iv4|1g07|ne:j64daf|1
Idaho Falls|idaho falls||US|pq|1p9j|9be3|-o0gd|ne:j64jth|1
Idlib|idlib||SY|pr|2rew|7p8h|7unh|ne:j643ht|1
Ifakara|ifakara||TZ|152|127s|-1qq8|7v0w|ne:j64aqx|1
Ife|ife||NG|1bi|ac71|1lpw|z6o|ne:j64d8v|1
Iganga|iganga||UG|ps|yqo|4p8|768u|ne:j63twx|1
Igarka|igarka||RU|wc|5ri|egkv|ik2x|ne:j64cnt|1
Igloolik|igloolik||CA|19z|18s|eudx|-hj4g|ne:j64m25|1
Igrim|igrim||RU|uq|7d5|djlp|dt2a|ne:j64j7n|1
Iguala|iguala||MX|mm|2ei2|3xqs|-lc20|ne:j645xt|1
Iguape|iguape||BR|1o6|ico|-5aqo|-a71v|ne:j64l2t|1
Iguatu|iguatu||BR|ca|1ib0|-1d2o|-8f8o|ne:j647dv|1
Ihosy|ihosy||MG|jj|d3y|-4su4|9vu7|ne:j64bo7|1
Ijebu Ode|ijebu ode||NG|1ag|4hef|1gmk|u8w|ne:j64d83|1
Ijevan|ijevan||AM|1pp|bdd|8rec|9odg|ne:j63yzp|1
Ijuí|ijui||BR|1gl|1ixu|-631z|-bk1r|ne:j64gsp|1
Ikare|ikare||NG|1au|nkpn|1m3s|18g0|ne:j64d8d|1
Ikela|ikela||CD|f9|83|-94l|4ziy|ne:j64ecz|1
Iksan|iksan||KR|rb|62r1|7pbm|r7im|ne:j644k1|1
Il'pyrskiy|il pyrskiy|ilpyrskoye|RU|sq|a|cupm|z6rc|ne:j64dlx|1
Ilam|ilam||IR|pt|39z2|77hs|9y98|ne:j64g6j|1
Ilam|ilam||NP|13g|dhv|5rmg|iufw|ne:j63vw3|1
Ilave|ilave||PE|be|cdd|-3g2k|-exks|ne:j64azz|1
Ilebo|ilebo||CD|tl|2amt|-xbw|4f10|ne:j64f8d|1
Ilhéus|ilheus||BR|60|4xy6|-361k|-8db8|ne:j64ky1|1
Iligan|iligan||PH|y5|9yhj|1r1s|qmga|ne:j64cl1|1
Illapel|illapel||CL|ey|kbo|-6s20|-f95g|ne:j64frz|1
Illichivsk|illichivsk|chornomorsk|UA|1ab|15qu|9x94|6kmi|ne:j643zd|1
Illizi|illizi||DZ|pv|651|5oci|1tbu|ne:j64l43|1
Ilo|ilo||PE|14u|159g|-3s40|-fago|ne:j64k93|1
Iloilo|iloilo|iloilo city|PH|py|8b4x|2alm|q9ka|ne:j64mf7|1
Ilorin|ilorin||NG|wv|giwo|1tiw|z3d|ne:j64khh|1
Ilulissat|ilulissat||GL|1fb|3el|eu2v|-ayag|ne:j64jr1|1
Imbituba|imbituba||BR|1j7|xiy|-61tk|-afgo|ne:j64gtx|1
Imperatriz|imperatriz||BR|12b|4oai|-16lc|-a6fo|ne:j64kwd|1
Impfondo|impfondo||CG|yy|g3f|cno|3v74|ne:j64fth|0
Imphal|imphal||IN|11z|5ogq|5bcw|k4x8|ne:j64jpp|1
In Amguel|in amguel|i n amguel|DZ|1oy|2c6|52tn|13un|ne:j64hzj|1
Incheon|incheon|inch on|KR|q2|1inlc|816l|r55v|ne:j64l6t|1
Independence|independence||US|14a|369y|8dmn|-k8ih|ne:j641rp|1
Indianapolis|indianapolis||US|q5|us0w|8iq7|-igwo|ne:j64lbd|1
Indiga|indiga||RU|17f|a|eiaq|ai7q|ne:j64j6p|1
Indore|indore||IN|10u|17f9s|4vaa|g9d3|ne:j64lzl|1
Indramayu|indramayu||ID|r4|2n3z|-1cvw|n7sm|ne:j64dyv|1
Ingeniero Guillermo N. Juarez|ingeniero guillermo n juarez|asentamiento|AR|jq|4z9|-54ew|-d98k|ne:j647xb|1
Ingeniero Jacobacci|ingeniero jacobacci||AR|1fx|4ev|-8uo8|-ewwp|ne:j647uf|1
Ingham|ingham||AU|1fn|4q7|-3zwg|vbtu|ne:j64ikj|1
Ingolstadt|ingolstadt||DE|7k|3i0t|agbc|2gck|ne:j64en3|1
Inhambane|inhambane||MZ|q7|2hc0|-5438|7kom|ne:j64kdf|1
Inhumas|inhumas||BR|le|xzu|-3i8g|-aly0|ne:j647s3|1
Inírida|inirida|obando puerto inirida|CO|ma|6zt|tqk|-ejyt|ne:j64ebl|1
Innisfail|innisfail||AU|1fn|7tr|-3r9t|vaub|ne:j64k71|1
Innsbruck|innsbruck||AT|1qn|3bri|a4tg|2g1g|ne:j64i35|1
Inongo|inongo||CD|6j|uy9|-eyw|3x1s|ne:j64kop|1
Inowrocław|inowroclaw||PL|wr|1oyn|bb93|3wtg|ne:j6461l|1
Inta|inta||RU|vt|hop|e5jq|cw96|ne:j64kf7|1
International Falls|international falls||US|142|brc|af0b|-k0rg|ne:j64l8p|0
Inukjuak|inukjuak|inoucdjouac port harrison|CA|1fv|18d|cj5o|-gqwg|ne:j64l15|1
Inuvik|inuvik||CA|19k|2by|ene4|-snmw|ne:j64l07|1
Invercargill|invercargill||NZ|1mr|11yo|-9y3i|10342|ne:j64n5x|1
Inverell|inverell||AU|17q|6lt|-6dok|wdzq|ne:j64idj|1
Inverness|inverness||GB|og|yue|cbf3|-wnx|ne:j64ait|1
Ioanina|ioanina|ioannina|GR|qc|1ulc|8i2v|4gvx|ne:j64ful|1
Iowa City|iowa city||US|qb|240k|8xgj|-jm90|ne:j641np|1
Ipatinga|ipatinga||BR|141|8qqe|-46b0|-9434|ne:j64gpv|1
Ipiales|ipiales||CO|16z|2cky|6eo|-gn5g|ne:j64e9h|1
Ipoh|ipoh||MY|1d0|efja|zhs|lntm|ne:j64kkb|1
Iporá|ipora||BR|le|lsu|-3ixg|-ayis|ne:j647rz|1
Ipswich|ipswich||GB|1nd|32xj|b5rz|910|ne:j64ah1|1
Ipú|ipu||BR|ca|kl2|-xbw|-8q75|ne:j64gv5|1
Iqaluit|iqaluit||CA|19z|4q4|dnwh|-eoju|ne:j64m1t|1
Iquique|iquique||CL|1pe|4vjf|-4c90|-f14k|ne:j64mkv|1
Iquitos|iquitos||PE|zn|9tyh|-sxo|-fp78|ne:j64lf3|1
Iracoubo|iracoubo||GF|mo|16o|16ac|-benc|ne:j64fdl|0
Iraklio|iraklio|heraklion,iraklion|GR|wd|2xtu|7kki|5dwp|ne:j64ksp|1
Irapuato|irapuato||MX|md|7a02|4fho|-lr6g|ne:j645x5|1
Irati|irati||BR|1ch|zd2|-5gj0|-auw8|ne:j647bp|1
Irbid|irbid||JO|qd|dxjk|6z5o|7omc|ne:j64685|1
Irbil|irbil|arbil,erbil|IQ|42|jui8|7r6a|9fk3|ne:j64jr7|1
Irecê|irece||BR|60|1d3e|-2f6w|-8z2k|ne:j64ky7|1
Iringa|iringa||TZ|qf|2ea4|-1ny8|7ndw|ne:j64arx|1
Irkutsk|irkutsk||RU|qg|ckp3|b7pc|mccy|ne:j64mff|1
Iron Mountain|iron mountain||US|13u|chj|9tkh|-ivi9|ne:j643df|1
Ironwood|ironwood||US|13u|5g8|9yge|-jboa|ne:j643dv|1
Irvine|irvine||US|bd|1sipk|77vo|-p96j|ne:j648hn|1
Ísafjörður|isafjordur||IS|1tq|1ye|e5wh|-4ymk|ne:j64k2f|1
Iseyin|iseyin||NG|1by|23o7|1phw|rp8|ne:j6460p|1
Isfahan|isfahan|esfahan|IR|iu|yw68|70bw|b2wl|ne:j64mm3|1
Ishim|ishim||RU|1s3|1gaa|c19a|evvm|ne:j64cff|1
Isikul|isikul|isilkul|RU|1at|gb4|brtz|f9wq|ne:j64cfb|1
Isiro|isiro||CD|1b8|3dak|lao|5x48|ne:j64knz|1
Iskandar|iskandar||UZ|1pk|46y9|8wlv|exnr|ne:j6447l|1
İskenderun|iskenderun||TR|nu|6dw7|7u98|7r38|ne:j64aft|1
Iskitim|iskitim||RU|19q|1bpf|bpot|hun5|ne:j645lt|1
Isla Mujeres|isla mujeres||MX|1ft|9mz|4jn8|-il2j|ne:j64d31|1
Islamabad|islamabad||PK|j8|gpuo|781n|fojj|ne:j64md1|1
Island Lake|island lake||CA|121|a|bkeq|-kb82|ne:j647h7|1
Ismaïlia|ismailia||EG|1h|e29z|6k1b|6wx4|ne:j64eft|1
Isna|isna|esna|EG|1ff|255s|5f54|6z5n|ne:j64ehp|1
Isparta|isparta||TR|ql|3oz2|83fo|6jkk|ne:j644fh|1
Istanbul|istanbul||TR|qm|5zn48|8t6l|67tt|ne:j64n2z|1
Itá|ita||PY|4r|vpe|-5gu0|-calc|ne:j64b4b|1
Itaberaba|itaberaba||BR|60|10hx|-2olo|-8myg|ne:j64gx1|1
Itaberaí|itaberai||BR|le|h2p|-3fm0|-aoc4|ne:j647s7|1
Itabuna|itabuna||BR|60|4r8y|-3648|-8f34|ne:j64gvn|1
Itacoatiara|itacoatiara||BR|2q|13qt|-o88|-cixc|ne:j64kw3|1
Itaituba|itaituba||BR|1ck|1z84|-wuy|-bziq|ne:j64kwn|1
Itajaí|itajai||BR|1j7|70eu|-5rk4|-afm8|ne:j64gtv|1
Itamaraju|itamaraju||BR|60|10r0|-3nh8|-8h0j|ne:j64gvt|1
Itambé|itambe||BR|60|i6e|-39l8|-8pi4|ne:j64gwt|1
Itanagar|itanagar||IN|4f|yp7|5t3w|k2cm|ne:j64gg7|1
Itanhaem|itanhaem||BR|1o6|1xqp|-56ko|-a140|ne:j647z5|1
Itapecuru Mirim|itapecuru mirim||BR|12b|qyn|-q8g|-9ia8|ne:j64745|1
Itapetinga|itapetinga||BR|60|1a2x|-39o4|-8mkk|ne:j647f5|1
Itapetininga|itapetininga||BR|1o6|2per|-520s|-aaog|ne:j64821|1
Itapeva|itapeva||BR|1o6|1ckt|-5510|-ah5s|ne:j64hjp|1
Itapipoca|itapipoca||BR|ca|171k|-r03|-8heg|ne:j64guf|1
Itaúna|itauna||BR|141|1nq0|-4as8|-9jwk|ne:j6476b|1
Ithaca|ithaca||US|17s|1a8q|93h2|-ge95|ne:j64jwp|1
Itigi|itigi||TZ|1l8|f7j|-17z8|7e1s|ne:j64asn|1
Ittoqqortoormiit|ittoqqortoormiit||GL|vw|d1|f3uq|-4phv|ne:j64jql|1
Itu|itu||BR|1o6|6v1m|-4zh4|-a4yw|ne:j6481x|1
Ituiutaba|ituiutaba||BR|141|1tup|-42dg|-almw|ne:j64783|1
Itumbiara|itumbiara||BR|le|1pem|-3xz0|-ajpg|ne:j64hd7|1
Ituni|ituni||GY|1sm|2s|15wc|-chgk|ne:j6449h|1
Itupiranga|itupiranga||BR|1ck|gfp|-13i8|-akeg|ne:j64751|1
Iturama|iturama||BR|141|mzx|-488k|-arcg|ne:j6477z|1
Ivanhoe|ivanhoe||AU|17q|7d|-71us|uxfc|ne:j64i9n|1
Ivano-Frankivsk|ivano frankivsk|ivano frankivs k|UA|qq|5653|ahl0|5anq|ne:j649np|1
Ivanovo|ivanovo||RU|qr|90pz|c7w4|8sfo|ne:j64kef|1
Ivdel|ivdel||RU|1nz|eyb|d0bc|cy5h|ne:j64cat|1
Ivugivik|ivugivik|ivujivik|CA|1fv|4c|ddly|-gp2w|ne:j64l13|1
Iwaki|iwaki||JP|k1|7np9|7xx5|u744|ne:j64f5x|1
Iwo|iwo||NG|1bi|5d8r|1mvg|w94|ne:j6460l|1
Izamal|izamal||MX|1wg|bje|4hi0|-j2vt|ne:j64d3j|1
Izaz|izaz|azaz|SY|2a|oby|7ubk|7xu1|ne:j643gz|1
Izhevsk|izhevsk|izevsk|RU|1sa|diwu|c6no|beq4|ne:j64kfh|1
Izmayil|izmayil|izmail|UA|1ab|1s6y|9pxb|66ie|ne:j649oh|0
İzmir|izmir||TR|qu|1jg54|88l9|5thm|ne:j64ldn|1
İzmit|izmit|kocaeli|TR|vo|9zyg|8qmo|6ey2|ne:j64aej|1
Jabal Ali|jabal ali|jebel ali,mina jabel ali|AE|hh|1pq8|5cpu|bsgr|ne:j6488j|1
Jabalpur|jabalpur||IN|10u|rjig|4yu2|h4x7|ne:j64lzj|1
Jaboatao|jaboatao|jaboatao dos guararapes|BR|1d4|f259|-1qks|-7i7s|ne:j6482b|1
Jaboticabal|jaboticabal||BR|1o6|1hjm|-4jys|-acx0|ne:j647zb|1
Jacareacanga|jacareacanga||BR|1cd|ofh|-1ccq|-cctw|ne:j64kwj|1
Jacarezinho|jacarezinho||BR|1ch|r2q|-4ypb|-apnc|ne:j647c1|1
Jackson|jackson||US|149|5dli|6x7w|-jbve|ne:j64m9b|1
Jackson|jackson||US|1q0|1crg|7mt1|-j1aj|ne:j6494b|1
Jacksonville|jacksonville|jacksonville florida|US|jp|l6cg|6i1k|-hi6n|ne:j64lb5|1
Jacksonville|jacksonville||US|18z|1nmw|7g5z|-glgi|ne:j64933|1
Jacmel|jacmel||HT|1na|pwb|3wpa|-fjp6|ne:j63tln|1
Jacundá|jacunda||BR|1cd|13n3|-y97|-aiz9|ne:j64go3|1
Jaén|jaen||ES|31|2htc|83fs|-tbk|ne:j649cl|1
Jaén|jaen||PE|b9|14i5|-1820|-gw3o|ne:j64b0h|1
Jaffna|jaffna||LK|qv|5cwg|22ni|h5bm|ne:j64kgd|1
Jaguaquara|jaguaquara||BR|60|w0q|-2wec|-8kes|ne:j647f1|1
Jaguarão|jaguarao||BR|1gl|mul|-6z8g|-bft0|ne:j64kxf|0
Jaipur|jaipur||IN|1fz|1qirs|5rqn|g8xs|ne:j64myn|1
Jakarta|jakarta||ID|qw|5fkw8|-1bml|mwab|ne:j64n3j|1
Jalal Abad|jalal abad||KG|qx|5c1v|8rx1|fnah|ne:j64bez|1
Jalalabad|jalalabad|jalabad|AF|16u|cteb|7dr3|f3hl|ne:j64hq1|1
Jalapa|jalapa||GT|qy|zd6|34wq|-jacy|ne:j63xmp|1
Jalingo|jalingo||NG|1p9|2iv1|1woc|2fnk|ne:j64d7l|1
Jaltipan|jaltipan|jaltipan de morelos|MX|1tm|1fp2|3ufc|-kb0o|ne:j645yp|1
Jamaame|jamaame|jamame|SO|rq|3yye|k2|95v6|ne:j64kgz|1
Jamalpur|jamalpur||BD|gh|3ljw|5c4s|ja24|ne:j64hrb|1
Jambi|jambi||ID|r0|9soy|-c9o|m7gk|ne:j64kph|1
Jamestown|jamestown||US|17s|zb0|90tq|-gzdv|ne:j6497p|1
Jamestown|jamestown||US|190|bmx|a1xg|-l5li|ne:j648cp|1
Jammu|jammu||IN|r1|gyc8|70f5|g1i8|ne:j64l7n|1
Jamshedpur|jamshedpur||IN|rd|rv34|4vuf|ih38|ne:j64m83|1
Janaúba|janauba||BR|141|17ng|-3dws|-9a6k|ne:j64gr3|1
Janesville|janesville||US|1vm|1hge|95ca|-j2w8|ne:j64301|1
Januária|januaria||BR|141|quz|-3bg0|-9id0|ne:j64kx5|1
Jaqué|jaque||PA|g2|11p|1m0m|-gr4s|ne:j64587|1
Jaraguá do Sul|jaragua do sul||BR|1j7|2seq|-5obk|-aiuw|ne:j647cn|1
Jardim|jardim||BR|137|ick|-4lqn|-c198|ne:j6475j|1
Jashore|jashore||BD|uy|589f|4ys8|j49s|ne:j64i4f|1
Jasper|jasper||CA|29|30j|bc1t|-pb4y|ne:j64kyz|1
Jataí|jatai||BR|le|1n2b|-3tyk|-b3b0|ne:j64hdd|1
Jaú|jau||BR|1o6|2jza|-4rzk|-aero|ne:j64hjj|1
Jauja|jauja||PE|rt|g8x|-2j1o|-g6k8|ne:j64b2z|1
Jawhar|jawhar|jowhar|SO|1k9|2dvw|lcm|9r7i|ne:j64cid|1
Jayapura|jayapura||ID|1cc|3mnx|-jjm|u5nc|ne:j64lo5|1
Jeddah|jeddah|jiddah|SA|11f|1sk2o|4m1g|8elp|ne:j64mul|1
Jefferson City|jefferson city||US|14a|16jn|89nq|-jr7p|ne:j64iyd|1
Jeju|jeju|cheju|KR|r8|8r3g|76kd|r48z|ne:j64ail|1
Jelgava|jelgava||LV|r9|1fuv|c54v|52yw|ne:j64bct|1
Jember|jember||ID|r6|6ee1|-1r27|od7t|ne:j64kmf|1
Jena|jena||DE|1qd|28so|awzc|2hco|ne:j64elp|1
Jendouba|jendouba||TN|ra|13o0|7tmw|1vik|ne:j63t63|1
Jeonju|jeonju|chonju|KR|rb|f8xs|7oh6|r90s|ne:j64cjp|1
Jequié|jequie||BR|60|2wly|-2yv8|-8l9c|ne:j64kxz|1
Jérémie|jeremie||HT|lz|nut|3zs3|-fvwg|ne:j63tk3|1
Jerusalem|jerusalem||IL|rc|m27o|6t7c|7jnm|ne:j64msj|0
Jhang|jhang||PK|1f3|7ba2|6pd0|fi2a|ne:j64be3|1
Jhansi|jhansi||IN|1sy|hpq6|5gea|gu5j|ne:j64gbh|1
Ji-Paraná|ji parana||BR|1gx|1e60|-2bl9|-da52|ne:j64mnd|1
Jiamusi|jiamusi||CN|o5|lv1c|a1cw|rxrt|ne:j64ltp|1
Jian|jian|ji an|CN|rf|b5fc|5tc8|oncg|ne:j64ewh|1
Jiangmen|jiangmen||CN|me|betf|4u8c|o8j4|ne:j64dyl|1
Jianmen|jianmen|jingmen city,tianmen|CN|p6|10lwg|6kig|o94t|ne:j64jjl|1
Jiaohe|jiaohe||CN|rj|2mx6|9dbf|ralw|ne:j64ez1|1
Jiaojing|jiaojing|jiaojiang|CN|1x7|a3t8|65as|q144|ne:j64exd|1
Jiaozuo|jiaozuo||CN|o6|id9k|7k08|o9lh|ne:j64jl5|1
Jiaxing|jiaxing||CN|1x7|l6cg|6lfw|pvp4|ne:j64jmp|1
Jiayuguan|jiayuguan|jiayuguan city|CN|kg|36ev|8j94|l2hk|ne:j64mht|1
Jieshou|jieshou||CN|36|31k9|74k8|oq1o|ne:j64dxd|1
Jiexiu|jiexiu||CN|1kg|1nju|7xsw|nzfc|ne:j64eq7|1
Jihlava|jihlava||CZ|wa|15lt|al6c|3c8p|ne:j64enh|1
Jijel|jijel||DZ|ri|3674|7w4c|18ho|ne:j63zg1|1
Jijiga|jijiga||ET|1lr|17ud|205c|9664|ne:j64fyz|1
Jilin|jilin|jilin city|CN|rj|1fcrk|9ed3|r4g9|ne:j64l7j|1
Jima|jima|jimma|ET|g|2r02|1n9c|7w6k|ne:j64ktb|1
Jimaní|jimani||DO|q4|52f|3yoy|-feem|ne:j63xpf|0
Jinan|jinan|jinan shandong|CN|1ke|1nyy8|7v01|p2q3|ne:j64mxf|1
Jinchang|jinchang||CN|kg|33e3|8919|lwdn|ne:j64dv1|1
Jincheng|jincheng||CN|1kg|gaf4|7lx8|o6lo|ne:j64eq3|1
Jingdezhen|jingdezhen||CN|rf|9suq|69uo|p460|ne:j64ewp|1
Jingmen|jingmen|jingmen city|CN|p6|8kn4|6nfk|o0yw|ne:j64eql|1
Jingzhou|jingzhou|shashi|CN|p6|b58g|6hy8|o1z0|ne:j646jn|1
Jinhua|jinhua||CN|1x7|nf90|68ow|pn84|ne:j64jmx|1
Jining|jining|jining shandong|CN|1ke|pf4g|7l60|ozah|ne:j64jm1|1
Jining|jining||CN|17d|61dg|8sl8|o8j4|ne:j64jnh|1
Jinja|jinja||UG|rk|6gqb|3ec|7467|ne:j64akz|1
Jinotega|jinotega||NI|rl|13ep|2t0e|-ifkw|ne:j640fl|1
Jinotepe|jinotepe||NI|bx|mrn|2jek|-ih32|ne:j640f5|1
Jinshi|jinshi||CN|p9|5vf4|6cn5|nz1x|ne:j64erd|1
Jinxi|jinxi|jinxi liaoning,lianshan|CN|ys|1fzww|8qg3|pwbc|ne:j64l75|1
Jinzhou|jinzhou||CN|ys|khnk|8tav|pyed|ne:j64jlt|1
Jipijapa|jipijapa||EC|11o|rp9|-aew|-h9rc|ne:j64e3x|1
Jiujiang|jiujiang||CN|rf|bp00|6dec|ouwo|ne:j64jmh|1
Jiutai|jiutai||CN|rj|4ehj|9gmf|qz0r|ne:j64ezn|1
Jixi|jixi|jixi heilongjiang|CN|o5|kolk|9pjv|s2k1|ne:j64ltx|1
Jizan|jizan|jaizan|SA|rm|2966|3mga|94da|ne:j64kbd|1
Jizzax|jizzax|dzhizak,jizzakh|UZ|rn|51lk|8lf0|ejdo|ne:j649sl|1
Joaçaba|joacaba||BR|1j7|tzw|-5tn8|-b1dk|ne:j647d1|1
João Pessoa|joao pessoa||BR|1ci|khnk|-1is0|-7h4c|ne:j64k13|1
Joaquín V. González|joaquin v gonzalez||AR|1i5|abk|-5djl|-dr8q|ne:j647wj|1
Jodhpur|jodhpur||IN|1fz|lbqw|5mvt|fndw|ne:j64lz1|1
Joensuu|joensuu||FI|191|1570|df0w|6doi|ne:j64jrh|1
Johannesburg|johannesburg||ZA|kk|21mgo|-5lwx|609l|ne:j64n17|1
John Day|john day||US|1b3|17p|9ipx|-phu8|ne:j648lj|1
Johnson City|johnson city||US|1q0|1ntu|7s71|-hng0|ne:j642ux|1
Johnstown|johnstown||US|1cy|1hgm|8n5z|-gwyu|ne:j64983|1
Johor Bahru|johor bahru|johor baharu,johore bharu|MY|ro|ir5k|bfo|m8dd|ne:j64j5b|1
Joinville|joinville|norte nordeste catarinense|BR|1j7|l6cg|-5n2k|-agv7|ne:j64k0p|1
Joliet|joliet||US|pu|cecc|8wg4|-ivu3|ne:j642m3|1
Joliette|joliette||CA|1fv|z01|9v71|-fqm5|ne:j647mv|1
Jonesboro|jonesboro||US|49|198b|7oka|-jfvm|ne:j648nh|1
Jönköping|jonkoping||SE|rz|1x9w|cdrl|31aq|ne:j64j0l|1
Joplin|joplin||US|14a|1kwz|7y5a|-k99n|ne:j648pt|1
Jorhat|jorhat||IN|4o|1h9l|5qek|k6zb|ne:j646st|1
Jos|jos||NG|1dw|hi9k|24mc|1wlg|ne:j64khn|1
José Batlle y Ordóñez|jose batlle y ordonez||UY|ye|1vq|-7698|-btb4|ne:j6411j|1
Juan Aldama|juan aldama||MX|1wo|axe|57fc|-m5rg|ne:j64cwl|1
Juan José Castelli|juan jose castelli||AR|cm|79p|-5k87|-czpy|ne:j64hht|1
Juanjuí|juanjui||PE|1iq|t3n|-1jbk|-gg4o|ne:j64b0z|1
Juazeiro|juazeiro||BR|60|21ek|-20oo|-8oi0|ne:j64k0z|1
Juazeiro do Norte|juazeiro do norte||BR|ca|4tse|-1jms|-8fe8|ne:j64k0t|1
Juba|juba||SS|ce|2eef|119o|6ro8|ne:j64lft|1
Juchitan|juchitan|juchitan de zaragoza|MX|1a6|1g6t|3irw|-kd6g|ne:j645vv|1
Juigalpa|juigalpa||NI|dw|168b|2lfw|-iaso|ne:j64507|1
Juina|juina||BR|136|r8|-2fyk|-cr3s|ne:j64grb|1
Juiz de Fora|juiz de fora||BR|141|a2sx|-4nz8|-9aom|ne:j64k0h|1
Juliaca|juliaca||PE|be|59kb|-3blk|-f17c|ne:j64j3b|1
Jullundur|jullundur|jalandhar|IN|1f3|ibq0|6psp|g72v|ne:j64l7z|1
Jumla|jumla||NP|tg|701|69p0|hmdz|ne:j63vrv|1
Jundiaí|jundiai||BR|1o6|au30|-4z0g|-a1q8|ne:j647zj|1
Juneau|juneau||US|26|np3|chyd|-st6w|ne:j64maj|1
Junín|junin||AR|e6|1tlb|-7euu|-d2d1|ne:j64hen|1
Junín|junin||PE|rt|btk|-2e14|-gahw|ne:j64b2v|1
Juradó|jurado||CO|dr|1tb|1iy9|-gnz0|ne:j64ea3|1
Jutiapa|jutiapa||GT|rv|133t|329g|-j9o8|ne:j646ql|1
Juticalpa|juticalpa||HN|1ap|sw2|3574|-ihcs|ne:j64a71|1
Jyekundo|jyekundo|gyegu|CN|kg|hqw|72ra|kqed|ne:j64jgd|1
Jyväskylä|jyvaskyla||FI|cf|23q0|dcej|5ios|ne:j64fzj|1
Kaabong|kaabong||UG|s1|vl|r5w|7b9s|ne:j64amj|1
Kabale|kabale||UG|s2|yew|-9n4|6fbs|ne:j64aqn|1
Kabalo|kabalo||CD|tw|n0p|-1aog|5rn0|ne:j64fbj|1
Kaberamaido|kaberamaido||UG|s5|2mg|df1|73uy|ne:j63tw1|1
Kabinda|kabinda||CD|tm|19j0|-1bao|58w0|ne:j64f9n|1
Kabul|kabul||AF|s6|1y8js|7eci|ett1|ne:j64n2h|1
Kabwe|kabwe||ZM|cd|41tf|-33f4|63is|ne:j64ld5|1
Kachiry|kachiry|kashyr|KZ|1cq|6w3|bdkk|gb44|ne:j64g3f|1
Kadoma|kadoma||ZW|12v|1p3a|-3xfo|6esb|ne:j64jzx|1
Kadugli|kadugli|kaduqli|SD|1mg|3sir|2cyc|6d60|ne:j64kb7|1
Kaduna|kaduna||NG|s9|uwnk|296s|1le5|ne:j64lmx|1
Kaédi|kaedi||SN|133|gpk|3gm4|-2w60|ne:j64lfj|0
Kaesong|kaesong||KP|sa|78x7|84xk|r4ks|ne:j6465b|1
Kafr el Sheikh|kafr el sheikh||EG|sb|3336|6o1e|6mpc|ne:j63x9v|1
Kafue|kafue||ZM|1mm|10oy|-3drc|61fs|ne:j64jzl|1
Kaga Bandoro|kaga bandoro||CF|16s|17m0|1hv0|43zs|ne:j64dpv|1
Kagoshima|kagoshima||JP|se|bwig|6rpw|rzez|ne:j64jn7|1
Kahama|kahama||TZ|1kn|rse|-th0|6ze0|ne:j64aot|1
Kahemba|kahemba||CD|6j|12kw|-1k71|42ls|ne:j64f6n|1
Kahramanmaraş|kahramanmaras||TR|s0|825p|8278|7x2i|ne:j644gt|1
Kaiapoi|kaiapoi||NZ|bp|7vc|-9aqd|1106m|ne:j64n4x|1
Kaifeng|kaifeng||CN|o6|iou8|7gx3|oibd|ne:j64jl7|1
Kaikoura|kaikoura||NZ|bp|1oc|-9364|11875|ne:j64n6x|1
Kailu|kailu||CN|17d|261|9cal|pz6o|ne:j64f0d|1
Kailua-Kona|kailua kona||US|o1|7m6|47n0|-xfkt|ne:j64iwj|1
Kaitaia|kaitaia||NZ|19j|40i|-7iwr|114zb|ne:j64n6v|1
Kaka|kaka||TM|s|tm5|8073|crvk|ne:j649qv|1
Kakamega|kakamega||KE|1vd|1cxu|28o|7fz8|ne:j64bad|1
Kakata|kakata||LR|12e|q6x|1ecs|-27uq|ne:j63wkb|1
Kakinada|kakinada||IN|33|6a0r|3mx7|hmjr|ne:j64jp1|1
Kakonko|kakonko||TZ|v6|j1s|-pb0|6mw0|ne:j64apt|1
Kaktovik|kaktovik||US|26|2t|f0sv|-us1p|ne:j64jxx|1
Kalabo|kalabo||ZM|1vd|5yr|-37ns|4v00|ne:j64a4h|1
Kalaburagi|kalaburagi|gulbarga|IN|th|ad5r|3pvg|ggqw|ne:j64lvn|1
Kalachinsk|kalachinsk||RU|1at|ikb|bsrb|fzdf|ne:j64cf1|1
Kalamata|kalamata||GR|1cw|1jf3|7xsl|4qmu|ne:j64ks3|1
Kalamazoo|kalamazoo||US|13u|3xhx|92bu|-ice8|ne:j649az|1
Kalangala|kalangala||UG|sg|40g|-2dt|6wne|ne:j63ts5|1
Kalasin|kalasin||TH|sh|16im|3irc|m6oi|ne:j63v65|1
Kalbarri|kalbarri||AU|1ve|16p|-5xh2|ogwz|ne:j64i7t|1
Kalemie|kalemie||CD|tw|4f5d|-19s5|69b4|ne:j64lun|1
Kalgoorlie|kalgoorlie||AU|1ve|sfo|-6l5m|q16w|ne:j64m5f|1
Kalima|kalima||CD|11y|5e|-jd4|5nxo|ne:j64f9f|1
Kaliningrad|kaliningrad||RU|sm|9bm2|bq2g|4e5p|ne:j64lhz|1
Kalispell|kalispell||US|14o|oqm|abwa|-oi2g|ne:j64jtf|1
Kalmar|kalmar||SE|sn|r0w|c58u|3iaa|ne:j649lj|1
Kaltag|kaltag||US|26|5a|dsco|-y0pf|ne:j643oz|1
Kaltukatjara|kaltukatjara||AU|19i|9v|-5izg|rncl|ne:j64i9b|1
Kaluga|kaluga||RU|sp|79k2|book|7rv0|ne:j64c0x|1
Kalyan|kalyan||IN|11a|xsiu|44ja|foia|ne:j646sj|1
Kambove|kambove||CD|tw|sbi|-2bvc|5p8w|ne:j64fbb|1
Kamenka|kamenka||RU|1cz|cs0|begb|9fuk|ne:j64c5d|1
Kamenna Obi|kamenna obi|kamen na obi|RU|2h|ydw|bj2o|hfm4|ne:j64cg7|1
Kamensk Shakhtinskiy|kamensk shakhtinskiy|kamensk shakhtinsky|RU|1h1|1mhy|acxi|8ml2|ne:j645el|1
Kamensk Uralskiy|kamensk uralskiy|kamensk uralsky|RU|1nz|3wtg|c3cd|d9w6|ne:j64c9t|1
Kamina|kamina||CD|tw|2rdv|-1vd0|5cz8|ne:j64kpb|1
Kamloops|kamloops||CA|9t|1h0q|auy3|-pshx|ne:j64kzd|1
Kampala|kampala||UG|sr|ufog|2gi|6zee|ne:j64mbl|1
Kampene|kampene||CD|11y|skq|-rrv|5psc|ne:j64f9b|1
Kamphaeng Phet|kamphaeng phet||TH|ss|19cz|3j3u|lbyy|ne:j63uy3|1
Kampong Cham|kampong cham||KH|wz|1s81|2klg|mlno|ne:j64hqn|1
Kampong Spoe|kampong spoe|kam|KH|x1|pn3|2gd4|meh2|ne:j63zbv|1
Kampong Thum|kampong thum|kampong thom|KH|x2|fe7|2q34|mhbu|ne:j63zcf|1
Kampot|kampot||KH|x3|12nt|29x7|mbvt|ne:j64hqx|1
Kamsar|kamsar||GN|8u|qzh|2ag6|-34oy|ne:j64gin|1
Kamuli|kamuli||UG|st|9uk|7b4|73jx|ne:j63txf|1
Kamyanets-Podilskyy|kamyanets podilskyy|kamianets podilskyi|UA|uu|2ggy|afnf|5p3l|ne:j643x3|1
Kamyshin|kamyshin||RU|1ua|2r8y|aqf8|9qb4|ne:j64c37|1
Kanab|kanab||US|1sv|2nm|7xuy|-o493|ne:j648mf|1
Kananga|kananga||CD|tl|gea0|-19fl|4stp|ne:j64luh|1
Kanash|kanash||RU|e2|12hq|bwb7|a69r|ne:j64cbj|1
Kanazawa|kanazawa||JP|qh|btch|7u3k|tabk|ne:j64jo5|1
Kanchanaburi|kanchanaburi||TH|sv|1d5f|305q|lbx0|ne:j649uf|1
Kanchipuram|kanchipuram||IN|1p2|3bmd|2r0x|h33j|ne:j64gep|1
Kandahar|kandahar||AF|sw|fc46|6rwk|e2wl|ne:j64mqd|1
Kandalaksha|kandalaksha||RU|15q|tf2|ee8r|6y40|ne:j64kdx|1
Kandi|kandi||BJ|2d|2cn9|2dvs|moo|ne:j64hyn|1
Kandy|kandy||LK|sx|2e6t|1k68|hagc|ne:j64ljp|1
Kangaba|kangaba||ML|6e|dao|2k4s|-1t4g|ne:j64d4v|1
Kangar|kangar||MY|1d2|1da5|1dmy|lh2k|ne:j63wpz|1
Kangerlussuaq|kangerlussuaq||GL|1fe|fg|ed31|-ava3|ne:j64jqt|1
Kangersuatsiaq|kangersuatsiaq|formerly proven|GL||5k|fihg|-bwmb|ne:j64l5x|1
Kanggye|kanggye||KP|cn|6f3u|8s5g|r4vk|ne:j64dit|1
Kangirsuk|kangirsuk|payne bay bellin|CA|1fv|f9|cv5k|-f047|ne:j64h5t|1
Kaniama|kaniama||CD|tw|s5d|-1meo|56hw|ne:j64fb1|1
Kankakee|kankakee||US|pu|1hpk|8tac|-itxv|ne:j64923|1
Kankan|kankan||GN|t0|2fyx|2864|-1zu4|ne:j64lzx|1
Kano|kano||NG|t1|1vau8|2klv|1tq5|ne:j64mv5|1
Kanoya|kanoya||JP|se|1rj3|6q5l|s1n8|ne:j646mv|1
Kanpur|kanpur||IN|1sy|1vrtc|5o6j|h7ql|ne:j64myp|1
Kansas City|kansas city||US|14a|vhhk|8drm|-k9zg|ne:j64la5|1
Kansas City|kansas city||US|t2|ar0p|8dsw|-ka65|ne:j641pl|1
Kansk|kansk||RU|wc|26bi|c1kc|kii4|ne:j64j9p|1
Kanyato|kanyato||TZ|v6|6g|-ydx|6hhy|ne:j64aq1|1
Kanye|kanye||BW|1mm|104v|-5co0|5fiw|ne:j64i6l|1
Kaohsiung|kaohsiung||TW|t3|1ncmo|4un1|prze|ne:j64mst|1
Kaolack|kaolack||SN|t4|5yd0|316k|-3g88|ne:j64lfh|1
Kaoma|kaoma||ZM|1vd|ays|-361g|5bcw|ne:j64a43|1
Kapan|kapan||AZ|1wl|wmo|8ehb|9y52|ne:j64hoz|0
Kapiri Mposhi|kapiri mposhi||ZM|cd|t9y|-2zsg|6554|ne:j64a2l|1
Kapoeta|kapoeta||SS|hx|5fm|10tl|776m|ne:j64ab7|1
Kaposvár|kaposvar||HU|1ls|2bqo|9xrq|3tcg|ne:j64an1|1
Kapuskasing|kapuskasing||CA|1av|74o|alav|-ho25|ne:j647k1|1
Kara Balta|kara balta||KG|8e|1l79|96he|fu3t|ne:j6455x|1
Karabük|karabuk||TR|1xb|2r78|8twg|6zjk|ne:j644mz|1
Karachi|karachi||PK|1l6|77zkg|5bwv|ecvt|ne:j64muv|1
Karaj|karaj||IR|1pt|uhzs|7o93|ax9t|ne:j64g61|1
Karakol|karakol||KG|1wf|1i57|93vc|gssq|ne:j64j55|1
Karaman|karaman||TR|ta|2kwf|7yw7|74ae|ne:j64ajt|1
Karamay|karamay||CN|1vs|5lqd|9rrv|i6s7|ne:j64jiz|1
Karamken|karamken||RU|111|a|cwic|weeq|ne:j64crv|1
Karasburg|karasburg||NA|tb|4o6|-6078|40lk|ne:j64djl|1
Karasuk|karasuk||RU|19q|m25|bik9|gq0r|ne:j64chv|1
Karbala|karbala||IQ|tc|ay1w|6znp|9fp1|ne:j64fwz|1
Karema|karema||TZ|1h2|cn5|-1gle|6itp|ne:j64aof|1
Kargat|kargat||RU|19q|8e9|btw7|h7gb|ne:j64chl|1
Kariba|kariba||ZW|12v|jp7|-3jjk|6680|ne:j64a6b|1
Karibib|karibib||NA|iq|5bm|-4pa6|3ebm|ne:j63w91|1
Karimnagar|karimnagar||IN|1pw|66ez|3yfw|gyf0|ne:j64fiv|1
Karlovac|karlovac||HR|te|16hj|9qzc|3byu|ne:j646gv|1
Karlskrona|karlskrona||SE|8o|r64|c1ny|3a0w|ne:j63unx|1
Karlsruhe|karlsruhe||DE|5s|839r|ai34|1stc|ne:j646fz|1
Karlstad|karlstad||SE|1uk|1l7h|cq2v|2w5z|ne:j649m7|1
Karluk|karluk||US|26|2o|cc8b|-x3s6|ne:j649i7|1
Karnal|karnal||IN|nr|4tnd|6d0k|ghwk|ne:j64fhd|1
Karoi|karoi||ZW|12v|jba|-3ls4|6d0g|ne:j64a61|1
Karokh|karokh|karukh|AF|ok|dho|7e3o|deym|ne:j64841|1
Karonga|karonga||MW|do|qe7|-24n5|79tx|ne:j64bk7|1
Karpinsk|karpinsk||RU|1nz|nrr|ct42|cv1e|ne:j64can|1
Karratha|karratha||AU|1ve|cyk|-4fyg|p1rw|ne:j64m5l|1
Kars|kars||TR|ti|1nse|8pc5|98jj|ne:j64akb|1
Kartaly|kartaly||RU|d2|lzr|bdbe|d083|ne:j64c7n|1
Karumba|karumba||AU|1fn|4t|-3qwh|u6oe|ne:j64k6n|1
Karungu|karungu||KE|1a3|1u0|-6k0|7bi4|ne:j64bkf|1
Karur|karur||IN|1p2|1ncj|2chs|gqht|ne:j64gel|1
Karusi|karusi|karuzi|BI|tj|89d|-nx4|6gqm|ne:j63zoj|1
Kasaji|kasaji||CD|tw|98h|-27zi|50xw|ne:j64faj|1
Kasama|kasama||ZM|19d|4abk|-26p8|6ol3|ne:j64a2h|1
Kasane|kasane||BW|19b|74y|-3tf4|5e24|ne:j64i5p|1
Kasangulu|kasangulu||CD|70|lkp|-zc4|394o|ne:j64f8p|1
Kasempa|kasempa||ZM|19c|4c6|-2vus|5j88|ne:j64a3l|1
Kasese|kasese||UG|tn|1fwl|1sl|6fe3|ne:j64j2v|1
Kashan|kashan||IR|iu|5cwg|7a70|b1zs|ne:j64g4z|1
Kashgar|kashgar|kashgar city|CN|1vs|auxc|8gln|ga6r|ne:j64mjp|1
Kashmar|kashmar||IR|1g8|3d8v|7jgm|cj0j|ne:j64jsh|1
Kasimov|kasimov||RU|1h8|saf|bry3|8ve3|ne:j64c5p|1
Kasongo|kasongo||CD|11y|1cm0|-yc4|5ppk|ne:j64luj|1
Kasongo-Lunda|kasongo lunda||CD|6j|fh8|-1dzw|3lv0|ne:j64f7l|1
Kaspiysk|kaspiysk||RU|ft|1r2w|96tn|a7h0|ne:j64cj3|1
Kassala|kassala||SD|ts|8ls5|3bag|7ssc|ne:j64mct|1
Kassel|kassel||DE|oc|67pg|azu0|21aw|ne:j646g7|1
Kasserine|kasserine||TN|tt|1mtv|7jqf|1v9b|ne:j63t6j|1
Kastamonu|kastamonu||TR|tv|1ibm|8vcy|78o6|ne:j63tnl|1
Kasulu|kasulu||TZ|v6|sth|-zc4|6g94|ne:j64apx|1
Kasur|kasur||PK|1f3|689f|6o5y|fyhy|ne:j64bdt|0
Katakwi|katakwi||UG|1st|6hc|elb|7a31|ne:j63u47|1
Katanning|katanning||AU|1ve|31a|-7810|p70t|ne:j64i8j|1
Katerini|katerini||GR|ue|154d|8mqr|4tmp|ne:j64fvb|1
Katherine|katherine||AU|19i|7tp|-33mi|sckq|ne:j64m55|1
Kathmandu|kathmandu||NP|85|j6l4|5xvm|iaaj|ne:j64mdb|1
Kati|kati||ML|6e|1fm7|2qds|-1qcg|ne:j64d4l|1
Katima Mulilo|katima mulilo||NA|bs|jb7|-3r10|576w|ne:j64dl3|1
Katoomba|katoomba||AU|17q|h18|-7831|w7vk|ne:j64ibp|1
Katowice|katowice||PL|1l3|1muts|art8|42rc|ne:j64dfn|1
Katsina|katsina||NG|tx|99g5|2s8g|1mn4|ne:j64dax|1
Kattaqorgon|kattaqorgon|katta kurgan|UZ|1ic|5ao9|8jvj|e79s|ne:j6445n|1
Katwe|katwe||UG|tn|1id|-100|6ev4|ne:j64aqf|1
Kaunas|kaunas||LT|ty|812r|bs00|549c|ne:j64bcn|1
Kavala|kavala||GR|2z|19pk|8rwk|58aa|ne:j646yz|1
Kavalerovo|kavalerovo||RU|1eq|ee9|9hla|sy1u|ne:j64cpd|1
Kavaratti|kavaratti||IN|y0|88w|29i2|fkgx|ne:j64fjp|1
Kavieng|kavieng||PG|17n|f80|-jx1|wboi|ne:j64kd5|1
Kawagoe|kawagoe||JP|1hw|78qz|7p55|twbj|ne:j646pp|1
Kawambwa|kawambwa||ZM|104|fvx|-23gj|68ds|ne:j64a23|1
Kawasaki|kawasaki||JP|su|ut02|7m5g|txyy|ne:j646pl|1
Kaya|kaya||BF|1j4|uvl|2t08|-8es|ne:j64iod|1
Kayanza|kayanza||BI|u1|f03|-mdk|6c4z|ne:j63zqb|0
Kayes|kayes||ML|u2|1nkn|33hw|-2g9s|ne:j64lwz|1
Kayes|kayes||CG|99|1c8p|-w94|2ugw|ne:j64lvz|1
Kayseri|kayseri||TR|u4|cpfs|8avq|7luc|ne:j64k3t|1
Kayunga|kayunga||UG|u5|gqw|5f5|71rq|ne:j63twd|1
Kazachye|kazachye|kavache|RU|1hy|0|f5s5|t71y|ne:j64jbh|1
Kazan|kazan||RU|1pn|nwc8|by6n|aj1o|ne:j64mep|1
Kearney|kearney||US|17a|och|8q1r|-l8ij|ne:j641sd|1
Kebili|kebili||TN|u8|fc3|77yc|1x7y|ne:j63t4t|1
Kecskemét|kecskemet||HU|ap|2fvr|a1vs|4808|ne:j644o7|1
Kediri|kediri||ID|r6|51fr|-1o3s|o074|ne:j64e1n|1
Kédougou|kedougou||SN|1p0|e2a|2ox0|-2lzc|ne:j64b6z|1
Keelung|keelung||TW|ua|apsw|5dxh|q3at|ne:j648a1|1
Keetmanshoop|keetmanshoop||NA|tb|dx3|-5p1n|3vw4|ne:j64khx|1
Keffi|keffi||NG|172|1uaf|1wa2|1or4|ne:j64dan|1
Keflavík|keflavik||IS|1nv|64a|dpye|-4u4i|ne:j64k2j|1
Kelang|kelang|klang|MY|1jy|khnk|nbj|lrjt|ne:j64j5d|1
Kelo|kelo||TD|1p3|228w|1zw3|3dww|ne:j64ef5|1
Kelowna|kelowna||CA|9t|2oj9|ap14|-plxt|ne:j64k1n|1
Keluang|keluang|kluang|MY|ro|3n1g|fq7|m57f|ne:j64bh1|1
Kem|kem||RU|td|ao5|dx6o|7eqc|ne:j64j65|1
Kemerovo|kemerovo||RU|uc|a84i|bv08|ig9w|ne:j64ljl|1
Kemi|kemi||FI|y8|hgx|e379|59o9|ne:j64ktl|1
Kemijärvi|kemijarvi||FI|y8|6ur|eaej|5vjr|ne:j64jrb|1
Kempsey|kempsey||AU|17q|94w|-6nve|wr6k|ne:j64id1|1
Kenai|kenai||US|26|5ve|cz8o|-wf44|ne:j64jy3|1
Kendari|kendari||ID|1nj|3jlt|-uip|q9yt|ne:j64kj7|1
Kendu Bay|kendu bay||KE|1a3|1yeo|-2rw|7fa8|ne:j64bkd|1
Kenema|kenema||SL|i2|32g1|1ot0|-2ecc|ne:j64b7h|1
Kenge|kenge||CD|6j|6p|-119k|3mef|ne:j64f6f|1
Kenitra|kenitra||MA|kw|btre|7cfk|-1ers|ne:j64brd|1
Kennewick|kennewick||US|1ux|273c|9wki|-pj9d|ne:j6419t|1
Kenora|kenora||CA|1av|8dg|ao03|-k8wq|ne:j64l0t|1
Kentau|kentau||KZ|1md|18ao|9brx|eopb|ne:j6464l|1
Kerch|kerch||RU|fa|39fn|9q2d|7tjl|ne:j649mv|1
Kerema|kerema||PG|mq|4cu|-1p5y|v9ak|ne:j63vxz|1
Keren|keren||ER|1k0|37qo|3czo|88ok|ne:j64ek3|1
Kerewan|kerewan||GM|101|24f|2w4c|-3g6u|ne:j63xx5|1
Kericho|kericho||KE|1gi|249w|-2rw|7k80|ne:j64b9z|1
Kerikeri|kerikeri||NZ|19j|4io|-7jtp|11a7n|ne:j64n7n|1
Kerkira|kerkira|corfu,kerkya|GR|qa|tpx|8hoa|49nv|ne:j64ftv|1
Kerma|kerma||SD|19d|314|47ht|6ip2|ne:j64aa3|1
Kerman|kerman||IR|ui|cdm2|6hso|c8fk|ne:j64jsl|1
Kermanshah|kermanshah||IR|uj|hr4p|7dak|a33p|ne:j64kuh|1
Kérouané|kerouane||GN|t0|bvy|1zj4|-1xlk|ne:j64gib|1
Keshan|keshan||CN|o5|1jv7|aakn|qz6s|ne:j64f3f|1
Ketchikan|ketchikan||US|26|6zy|bv4q|-s7xc|ne:j64jxh|1
Key West|key west||US|jp|mo1|59gw|-hj1f|ne:j64jv5|1
Khabarovsk|khabarovsk||RU|un|cerc|advq|sylc|ne:j64llh|1
Khakhar|khakhar||RU|un|a|ccyi|t0zg|ne:j64jcx|1
Khammam|khammam||IN|1pw|68ev|3pc4|h6ip|ne:j64fil|1
Khandyga|khandyga||RU|1hy|58s|dfj8|t2ao|ne:j64jbx|1
Khanty Mansiysk|khanty mansiysk||RU|uq|1gbc|d2ov|esf3|ne:j64j7t|1
Kharkiv|kharkiv||UA|ur|vbbc|aptf|7rox|ne:j64lcl|1
Khartoum|khartoum|al khartum|SD|us|2tw7k|3cak|6z0q|ne:j64muj|1
Khaskovo|khaskovo|haskovo,kurdzhali|BG|nt|1phv|8zn2|5h8x|ne:j64i1j|1
Khatanga|khatanga||RU|1pq|2h1|ffvf|lymi|ne:j64lkj|1
Kherson|kherson||UA|fa|6va5|9zth|6zjr|ne:j649n3|1
Khilok|khilok||RU|dn|877|b07w|no8k|ne:j64jb7|1
Khiwa|khiwa|khiva|UZ|ux|37jr|8vdj|cxph|ne:j649r3|1
Khmelnytskyy|khmelnytskyy|khmel nyts kyz,khmelnytskyi|UA|uu|8jd6|ald5|5scf|ne:j643wp|1
Kholmsk|kholmsk||RU|1hz|pe7|a30p|ug5s|ne:j645qj|1
Khomeini Shahr|khomeini shahr|khomeyni shahr|IR|iu|9daq|70bg|b158|ne:j64g53|1
Khon Kaen|khon kaen||TH|uw|5dps|3ip4|m1fw|ne:j64j15|1
Khorgo|khorgo||RU|1hy|a|fr01|ocrw|ne:j645pd|1
Khorramabad|khorramabad||IR|zm|81i6|76c4|ad2k|ne:j64g6f|1
Khorugh|khorugh||TJ|lm|n5c|8197|fc2c|ne:j64j11|1
Khromtau|khromtau||KZ|3s|iar|arvv|cj04|ne:j64jrl|1
Khujand|khujand||TJ|yl|9dpw|8mvo|ex6v|ne:j64j13|1
Khujayli|khujayli|xo jayli|UZ|t9|1alt|9373|cqqd|ne:j6444x|0
Khulna|khulna||BD|uy|xaaw|4w8z|j719|ne:j64m4x|1
Khvoy|khvoy|khoy|IR|1v1|4cfc|89aw|9mzo|ne:j64g7t|1
Kiama|kiama||AU|17q|80b|-7ftk|wbw0|ne:j64ibl|1
Kibaha|kibaha||TZ|1f7|i8z|-1g7n|8ca7|ne:j63wb7|1
Kibale|kibale|kibaale|UG|v1|40g|668|6npn|ne:j63u2p|1
Kibiti|kibiti||TZ|1f7|n9v|-1nn4|8cjg|ne:j64arb|1
Kiboga|kiboga||UG|v2|b74|72h|6t66|ne:j63tzz|1
Kibungo|kibungo||RW|i2|zog|-gpv|6jlh|ne:j63u9z|1
Kibuye|kibuye||RW|1vd|1120|-ftg|6ags|ne:j63u9h|1
Kiel|kiel||DE|1jw|5rw3|bn7s|265w|ne:j64em3|1
Kielce|kielce||PL|1o1|4mgl|awo8|4few|ne:j64dfz|1
Kieta|kieta||PG|197|5da|-1byr|xcvh|ne:j64bph|1
Kiffa|kiffa||MR|4n|1l1m|3k8o|-2fyo|ne:j64krp|1
Kigali|kigali||RW|v5|ifkw|-f24|6fxm|ne:j64le1|1
Kigoma|kigoma||TZ|v6|3ir0|-11ng|6ch0|ne:j64aqb|1
Kikwit|kikwit||CD|6j|do2w|-12t8|41g4|ne:j64mk1|1
Kilchu|kilchu|kilju county|KP|nk|2625|8s1w|rpuc|ne:j64dif|1
Kilifi|kilifi||KE|ec|1pzn|-ruo|8jhg|ne:j64bk5|1
Kilindoni|kilindoni||TZ|1f7|9kp|-1p2z|8hxw|ne:j64arj|1
Kilinochchi|kilinochchi||LK|v8|2811|20j8|h8db|ne:j64ahf|1
Kilis|kilis||TR|km|1ri5|7vc4|7yf4|ne:j64ak1|1
Kilkenny|kilkenny||IE|v9|gnp|baaa|-1jyj|ne:j64dov|1
Killarney|killarney||IE|uk|96m|b5mg|-21fj|ne:j64doz|1
Killeen|killeen||US|1q4|2yf3|6o3p|-ky2j|ne:j648tl|1
Kilosa|kilosa||TZ|152|1ywh|-1grw|7xf0|ne:j64ar1|1
Kimba|kimba||AU|1m5|ho|-73s8|t8q6|ne:j64iff|1
Kimbe|kimbe||PG|1v9|ejj|-16to|w6ie|ne:j63vzn|1
Kimberley|kimberley||ZA|19f|3jio|-65t8|5b4k|ne:j64kbv|1
Kimchaek|kimchaek||KP|nk|40hy|8ptv|roxn|ne:j64jf1|1
Kimhyonggwon|kimhyonggwon||KP|1h7|2yn|8qy7|rgup|ne:j64663|1
Kimmirut|kimmirut||CA|19z|ap|dgyc|-ez81|ne:j64kzp|1
Kimpese|kimpese||CD|70|85u|-16tk|33d9|ne:j64f8l|1
Kimry|kimry||RU|1s1|146e|c6sz|805g|ne:j64bzt|1
Kindersley|kindersley||CA|1jo|3dr|b14e|-ne2t|ne:j64gz1|1
Kindia|kindia||GN|va|2ibq|25mg|-2rb0|ne:j64kv7|1
Kindu|kindu||CD|11y|5mv6|-mvb|5jx8|ne:j64kp1|1
Kineshma|kineshma||RU|qr|1zqv|cbfw|912s|ne:j645bx|1
King Salmon|king salmon||US|26|84|ckuf|-xkt2|ne:j649iz|1
King Sejong Station|king sejong station||AQ||2i|-dc4p|-clhg|ne:j64iuj|1
Kingaroy|kingaroy||AU|1fn|6m5|-5ory|wjly|ne:j64ik1|1
Kingman|kingman||US|48|wjq|7jiz|-og16|ne:j648fn|1
Kingoonya|kingoonya||AU|1m5|1e|-6mf8|szzc|ne:j64ifb|1
Kingsport|kingsport||US|1q0|18cb|7u0b|-hp1v|ne:j642vh|1
Kingston|kingston||JM|vb|k3j8|3upn|-ggca|ne:j64miv|1
Kingston|kingston||CA|1av|2g43|9hb5|-ge5d|ne:j64h45|1
Kingston|kingston||AU|1pl|b37|-97pz|vkn0|ne:j64inx|1
Kingston South East|kingston south east|kingston se|AU|1m5|5q|-7w7c|tz39|ne:j64iex|1
Kingston upon Hull|kingston upon hull||GB|vc|6h94|biqo|-2jo|ne:j64act|1
Kingstown|kingstown||VC||126l|2tgb|-d4bd|ne:j64m73|1
Kingsville|kingsville||US|1q4|jhs|5wbc|-kz26|ne:j648t7|1
Kinkala|kinkala||CG|1e8|apm|-xm0|35wk|ne:j63yad|1
Kinshasa|kinshasa||CD|ve|4o3p4|-xe6|3a5m|ne:j64n1v|1
Kipili|kipili||TZ|1h2|16l|-1lcp|6k40|ne:j64aob|1
Kipushi|kipushi||CD|tw|2fgj|-2iqk|5u9g|ne:j64fb5|1
Kirensk|kirensk||RU|qg|a9o|cdvl|n673|ne:j64cm7|1
Kırıkkale|kirikkale||TR|vd|4iwy|8jhk|76pw|ne:j64ak5|1
Kirkenes|kirkenes||NO|jm|2j6|ey02|6fvo|ne:j64kbl|1
Kırklareli|kirklareli||TR|vf|18xb|8y3a|5u2s|ne:j63tm3|1
Kirksville|kirksville||US|14a|et5|8m4x|-judg|ne:j641s1|1
Kirkuk|kirkuk||IQ|4v|cw2h|7lpe|9ij7|ne:j64lxh|1
Kirkwall|kirkwall||GB|14x|6k4|cmzq|-mrg|ne:j64aip|1
Kirov|kirov|vyatka|RU|vg|9syl|ck31|an98|ne:j64lj1|1
Kirov|kirov||RU|sp|uc7|blbo|7cp4|ne:j64c11|1
Kirovo-Chepetsk|kirovo chepetsk||RU|vg|1xn0|cjt4|aq58|ne:j645i5|1
Kirovohrad|kirovohrad|kropyvnytskyi|UA|vh|5cha|ae9d|6wx7|ne:j649od|1
Kirovsk|kirovsk||RU|15q|mud|ehob|77sf|ne:j64bxh|1
Kirs|kirs||RU|vg|8s9|cpo2|b74k|ne:j64c9b|1
Kirsanov|kirsanov||RU|1p1|dvb|bab2|95ly|ne:j645gp|1
Kırşehir|kirsehir||TR|vi|20sg|8e0s|7bny|ne:j63tof|1
Kiruna|kiruna||SE|18w|e0a|ejj8|4bzq|ne:j64k8b|1
Kirundo|kirundo||BI|vj|4oz|-jxz|6g8c|ne:j63zrj|1
Kisangani|kisangani||CD|1b8|cecm|40g|5elk|ne:j64lrd|1
Kiselevsk|kiselevsk|kiselyovsk|RU|uc|288w|bko0|ikio|ne:j645lb|1
Kishkenekol|kishkenekol||KZ|192|58b|bhv4|fi6u|ne:j64g2x|1
Kisii|kisii||KE|1a3|m0z|-560|7g7k|ne:j64bkj|1
Kislovodsk|kislovodsk||RU|1mx|2ug3|9et8|95mo|ne:j6459p|1
Kismaayo|kismaayo|kismayo|SO|rq|517o|-2r2|942n|ne:j64kh1|1
Kisoro|kisoro||UG|vk|9yc|-ag3|6d5j|ne:j63u8x|1
Kissidougou|kissidougou||GN|jb|1fjz|1ywx|-2634|ne:j64gjf|1
Kissimmee|kissimmee||US|jp|4tzq|62ax|-hg5a|ne:j648y5|1
Kisumu|kisumu||KE|1a3|8h9b|-p0|7g4s|ne:j64kl3|1
Kita|kita||ML|u2|ztv|2sp4|-2169|ne:j64d5h|1
Kitakyūshū|kitakyushu||JP|k0|ldpc|79cg|s1ew|ne:j64ezt|1
Kitale|kitale||KE|1gi|384f|7y9|7hzf|ne:j64ba3|1
Kitami|kitami||JP|oo|2fap|9eco|uuc8|ne:j64f51|1
Kitchener|kitchener||CA|1av|8xrd|9b9g|-h954|ne:j647kz|1
Kitgum|kitgum||UG|vl|17wb|pgs|71mk|ne:j64alx|1
Kitty Hawk|kitty hawk||US|18z|2mt|7qdh|-g853|ne:j6493j|1
Kitwe|kitwe||ZM|ew|8of9|-2quc|61qw|ne:j64ldb|1
Kivalina|kivalina||US|26|ae|eimb|-z96j|ne:j649ij|1
Kizel|kizel||RU|1d3|h2v|cnqs|ccpj|ne:j6462j|1
Klagenfurt|klagenfurt||AT|x4|1xwy|9zq3|32f0|ne:j64i2n|1
Klaipėda|klaipeda||LT|vn|44dv|bxxw|4iyn|ne:j64bbz|1
Klaksvík|klaksvik||FO|j6|3lk|dc87|-1ege|ne:j640kx|1
Klamath Falls|klamath falls||US|1b3|x5u|91t6|-q3nx|ne:j64ixz|1
Klerksdorp|klerksdorp||ZA|198|3u21|-5reo|5peg|ne:j64kcl|1
Klin|klin||RU|155|1qbu|c2qv|7v63|ne:j645dh|1
Klintsy|klintsy||RU|a0|1f6o|bb50|6wsw|ne:j64byh|1
Klyuchi|klyuchi||RU|sq|u9|c2ew|yh4k|ne:j64jg1|1
Knoxville|knoxville||US|1q0|e1pk|7pjo|-hzj4|ne:j64lbh|1
Knysna|knysna||ZA|1vf|1coy|-7all|4xq5|ne:j64bip|1
Kōbe|kobe||JP|pf|wrdq|7flc|syz8|ne:j64jod|1
København|kobenhavn|copenhagen|DK|ox|n96w|bxmt|2oxb|ne:j64mz1|1
Koblenz|koblenz||DE|1ge|6p89|asi9|1mn4|ne:j64em7|1
Kobuk|kobuk||US|26|47|ec9c|-xmi2|ne:j643q5|1
Kochi|kochi||IN|uh|wk2g|25ai|gc4s|ne:j64lvd|1
Kōchi|kochi||JP|vp|76xe|76yw|smdr|ne:j64ltb|1
Kodiak|kodiak||US|26|7at|cdws|-wnza|ne:j64ma3|1
Kodinskiy|kodinskiy|kodinsk|RU|wc|c3a|ckx1|l99d|ne:j64cmp|1
Koforidua|koforidua||GH|i2|3cvh|1azs|-208|ne:j64ffb|1
Kōfu|kofu||JP|1w0|48f8|7n2w|tpbd|ne:j64f5t|1
Kogalym|kogalym||RU|uq|18wg|daqm|fyst|ne:j64cen|1
Kogon|kogon|kagan|UZ|a6|2azy|8ihn|du1e|ne:j649qz|1
Kohat|kohat||PK|165|7coj|77a3|fb6f|ne:j6456x|1
Kohima|kohima||IN|167|1z2p|5i1q|k67i|ne:j64fld|1
Kohtla-Järve|kohtla jarve||EE|pp|zjg|cqc0|5uip|ne:j646ix|1
Koidu|koidu||SL|i2|1vjn|1t4l|-2bpw|ne:j64b7d|1
Kok Yangak|kok yangak|kokjanggak|KG|qx|bko|8slf|fouy|ne:j6456j|1
Kokkola|kokkola||FI|1vg|101m|dojh|4ydb|ne:j64jrd|1
Koko|koko||NG|u7|jwg|2g54|yuq|ne:j64dbn|1
Kokomo|kokomo||US|q5|1b5t|8oec|-igm0|ne:j6492n|1
Kokshetau|kokshetau||KZ|3q|2rft|bf9k|evnc|ne:j64jrz|1
Koktokay|koktokay||CN|1vs|1pq8|a2no|j6bu|ne:j64ep7|1
Kolar|kolar||IN|th|33ld|2tc9|gqvq|ne:j64fjz|1
Kolda|kolda||SN|vs|1hg3|2rm8|-37cs|ne:j64b6p|1
Kolhapur|kolhapur||IN|11a|g2pc|3kuw|fwoo|ne:j64lvp|1
Kolkata|kolkata||IN|1v3|8sxq0|4tl5|ixi3|ne:j64n41|1
Kollam|kollam||IN|uh|8g4z|1woc|getg|ne:j64fj3|1
Kolomna|kolomna||RU|155|35yi|bt00|8b9m|ne:j645dv|1
Kolpashevo|kolpashevo||RU|1r3|lic|chuk|hsea|ne:j64j5n|1
Kolpino|kolpino||RU|e5|4u89|csvo|6khw|ne:j645b5|1
Kolwezi|kolwezi||CD|tw|8yj4|-2aov|5gjo|ne:j64mk5|1
Kom Ombo|kom ombo||EG|4t|6ije|58t8|728s|ne:j64knn|1
Komatini|komatini|komotini|GR|2z|z7j|8tdx|5g47|ne:j63y27|1
Komatipoort|komatipoort||ZA|15i|fto|-5g28|6ug8|ne:j64bmn|0
Kombissiri|kombissiri||BF|7l|n95|2l34|-aak|ne:j63zv3|1
Kompong Chhnang|kompong chhnang|kampong chhnang,kampong chnang|KH|x0|1m24|2mix|mfm2|ne:j64hqt|1
Komsa|komsa||RU|wc|a|d9dk|j4pt|ne:j64j9n|1
Komsomolets|komsomolets||KZ|1fh|7la|biqq|das6|ne:j64g0n|1
Komsomolsk na Amure|komsomolsk na amure|komsomolsk on amur|RU|un|5ww4|au32|td94|ne:j64jd3|1
Kon Tum|kon tum||VN|1fj|29e9|32zi|n57d|ne:j649zx|1
Kondopoga|kondopoga||RU|td|qig|dc07|7ckn|ne:j64ke1|1
Kondoz|kondoz|konduz,kunduz|AF|wm|5kgx|7ve8|erf9|ne:j64hpv|1
Koneurgench|koneurgench|konye urgench|TM|1pj|o88|92in|coj7|ne:j6444j|1
Kongolo|kongolo||CD|tw|296a|-15ib|5s6g|ne:j64fbf|1
Konibodom|konibodom||TJ|yl|5kis|8mwa|f3f4|ne:j6446x|1
Konotop|konotop||UA|1np|27wb|aze0|748q|ne:j643zp|1
Kontagora|kontagora||NG|185|2476|2890|167f|ne:j64d7p|1
Kontcha|kontcha||CM|d|66q|1ph2|2me5|ne:j64hn5|1
Konya|konya||TR|vz|jp3s|849e|6ykb|ne:j64ldv|1
Konza|konza||KE|1gi|1jo|-di0|7yf4|ne:j64b97|1
Korçë|korce||AL|w3|18yb|8pef|4g8j|ne:j63yrx|1
Korf|korf||RU|sq|b4|cxix|zjgn|ne:j64dm1|1
Korhogo|korhogo||CI|1js|3t4f|20zs|-17io|ne:j64kv1|1
Kōriyama|koriyama||JP|k1|7as0|80no|u36g|ne:j646q3|1
Korla|korla||CN|1vs|d4zs|8xzo|igqk|ne:j64jip|1
Korogwe|korogwe||TZ|1p4|12kw|-139s|89dk|ne:j64att|1
Koror|koror||PW||8n4|1koc|stkn|ne:j64ith|1
Korosten|korosten||UA|1x8|1kbc|ax4w|652c|ne:j649op|1
Korsakov|korsakov||RU|1hz|r2r|9zw8|ulof|ne:j64jdp|1
Kos|kos||GR|19l|euk|7wo9|5uk8|ne:j64fvt|1
Košice|kosice||SK|w8|52j7|ag08|4jys|ne:j64bcd|1
Kosti|kosti||SD|1vk|7e98|2tmc|7008|ne:j64kb1|1
Kostroma|kostroma||RU|w5|5y8o|cdr8|8rw8|ne:j64keh|1
Koszalin|koszalin||PL|1va|2awq|bm7k|3gvd|ne:j6489f|1
Kota|kota||IN|1fz|hq48|5eaz|g94r|ne:j64lyz|1
Kota Baharu|kota baharu|kota bharu|MY|ub|au3z|1b80|lwt8|ne:j64kkd|1
Kota Kinabalu|kota kinabalu||MY|1hg|bb5j|1a54|ovws|ne:j64kkv|1
Kotabumi|kotabumi||ID|y4|wou|-11al|mhew|ne:j64km7|1
Kotelnich|kotelnich||RU|vg|lxr|chvl|acsh|ne:j64c9j|1
Kotlas|kotlas||RU|4a|1a7b|d4pj|a01z|ne:j64keb|1
Kotlit|kotlit|kotlik|US|26|ru|didm|-z1zh|ne:j649jd|1
Kotovsk|kotovsk||RU|1p1|pit|b9tn|8w90|ne:j64c61|1
Kotzebue|kotzebue||US|26|2gq|ec6z|-yulq|ne:j649kb|1
Koudougou|koudougou||BF|9d|1veb|2mix|-iac|ne:j64io1|1
Koulamoutou|koulamoutou|kaulomoutou|GA|1ae|cim|-8qp|2obl|ne:j64fmp|1
Koulikoro|koulikoro||ML|6e|igf|2rep|-1m98|ne:j64krv|1
Koundara|koundara||GN|8u|asm|2oao|-2ulc|ne:j63yfp|1
Koupéla|koupela||BF|w7|oqc|2lyi|-2qw|ne:j63zyt|1
Kourou|kourou||GF|mo|ijh|13tc|-ba8z|ne:j64kpl|0
Kouroussa|kouroussa||GN|t0|az3|2a76|-24bs|ne:j63ydv|1
Koutiala|koutiala||ML|1l1|28yn|2nls|-167g|ne:j64d5l|1
Kouvola|kouvola||FI|1mn|o0t|d1q0|5q36|ne:j63y5h|1
Kovda|kovda||RU|15q|k|eal3|71mm|ne:j64j5x|1
Kovel|kovel||UA|1ud|1j0l|az6z|5apq|ne:j649o3|1
Kovrov|kovrov||RU|1u8|3b00|c2vo|8uwk|ne:j64c6b|1
Koyuk|koyuk||US|26|72|dx2z|-yjhz|ne:j649jn|1
Koyukuk|koyukuk||US|26|2t|dwmb|-xsts|ne:j643pn|1
Kozhikode|kozhikode||IN|uh|kfc8|2eto|g8mo|ne:j64m7z|1
Kpalimé|kpalime||TG|1dx|25j3|1h8s|4v0|ne:j649dl|1
Krabi|krabi||TH|w9|o37|1q4o|l77k|ne:j63uvp|1
Kracheh|kracheh|kratie|KH|wg|fev|2o7m|mq34|ne:j63ze7|1
Kragujevac|kragujevac||RS|1y5|3o3h|9fns|4hf4|ne:j647ol|1
Kraków|krakow||PL|yo|g7c0|aqa3|49zx|ne:j64ln1|1
Kramatorsk|kramatorsk||UA|h9|3y21|afx6|81m8|ne:j64417|1
Krasino|krasino||RU|4a|a|f5rm|bnww|ne:j64j67|1
Krasnoarmeysk|krasnoarmeysk||RU|1jk|jxt|axni|9slq|ne:j64kfn|1
Krasnodar|krasnodar||RU|wb|dxff|9ndk|8cxc|ne:j64lil|1
Krasnogorsk|krasnogorsk||RU|1hz|2js|adxk|ugdg|ne:j64cs7|1
Krasnokamensk|krasnokamensk||RU|dn|15ws|aqbd|pap5|ne:j64jb3|1
Krasnokamsk|krasnokamsk||RU|1d3|14nl|cg3v|by4j|ne:j64dgt|1
Krasnoturinsk|krasnoturinsk|krasnoturyinsk|RU|1nz|1e26|ctdo|cypc|ne:j645id|1
Krasnoufimsk|krasnoufimsk||RU|1nz|x9t|c4pz|cdo2|ne:j64cax|1
Krasnouralsk|krasnouralsk||RU|1nz|fvf|ci8r|cvcz|ne:j645ix|1
Krasnoyarsk|krasnoyarsk||RU|wc|jtqg|c07z|jwjl|ne:j64mfh|1
Kremenchuk|kremenchuk||UA|1e4|4zl2|aiqb|75y0|ne:j649pl|1
Kribi|kribi||CM|1n7|16m0|mos|24gs|ne:j64h93|1
Krishnanagar|krishnanagar||IN|1v3|34li|50ej|iz3o|ne:j64jsx|1
Kristiansand|kristiansand||NO|1tp|1d8m|cgte|1pq8|ne:j64lg3|1
Kristianstad|kristianstad||SE|1li|ou4|c0cx|311x|ne:j64auj|1
Krong Koh Kong|krong koh kong|koh kong,krong kaoh kong|KH|u6|pke|2hn3|m2mx|ne:j64hqf|1
Kroonstad|kroonstad||ZA|1az|288o|-5xfc|5tyc|ne:j64kcn|1
Kropotkin|kropotkin||RU|wb|1pf3|9qo7|8p4t|ne:j645gd|1
Krujë|kruje||AL|hr|gfa|8wd2|48r6|ne:j63ynj|1
Kryvyy Rih|kryvyy rih|kryvyi rih|UA|h4|dzdo|a9tf|75ai|ne:j64403|1
Ksar El Kebir|ksar el kebir||MA|1p5|6kko|7i7w|-19lo|ne:j64bqx|1
Kuala Lipis|kuala lipis||MY|1c2|bx4|wa8|lvd0|ne:j63wqp|1
Kuala Lumpur|kuala lumpur||MY|1jy|v1a8|og6|lspg|ne:j64mvp|1
Kuala Terengganu|kuala terengganu||MY|1rk|7i82|154o|m3og|ne:j64bhl|1
Kualakapuas|kualakapuas||ID|sk|rhs|-nx0|oibw|ne:j64fc1|1
Kuantan|kuantan||MY|1c2|7ul1|tjw|m580|ne:j64kkh|1
Kuching|kuching||MY|1jm|c84n|bt0|nnb8|ne:j64lpn|1
Kudymkar|kudymkar||RU|vu|p0n|cnde|bpju|ne:j64dgh|1
Kugluktuk|kugluktuk||CA|19z|106|ej4z|-oob9|ne:j64m1x|1
Kuito|kuito||AO|8m|2g6m|-2niw|3mpk|ne:j64l3f|1
Kukës|kukes||AL|wh|drc|90pq|4do4|ne:j63yq1|1
Kullorsuaq|kullorsuaq||GL||ci|fzg5|-c9ju|ne:j64iwf|1
Kulob|kulob||TJ|ut|2gv0|84lo|eye5|ne:j649sd|1
Kulunda|kulunda||RU|2h|bu9|b9qb|gx5t|ne:j64cgh|1
Kulusuk|kulusuk|kap dan|GL|vw|7y|e1wy|-7ywp|ne:j64jqh|1
Kumaka|kumaka||GY|1si|1ou|u3g|-cigo|ne:j64a7f|1
Kumamoto|kumamoto||JP|wi|fe6w|713d|s0hq|ne:j64ezx|1
Kumasi|kumasi||GH|4m|za28|1fmv|-clc|ne:j64kpn|1
Kumba|kumba||CM|1nc|33fh|zt0|20u8|ne:j64h8l|1
Kumbakonam|kumbakonam||IN|1p2|2zgg|2cq5|h0nk|ne:j64gf7|1
Kumbo|kumbo||CM|18p|2otq|1bzw|2aeo|ne:j64hlt|1
Kumertau|kumertau||RU|74|1eeh|bb7o|byfn|ne:j64c6t|1
Kumi|kumi|kumi town|UG|wj|a14|b9s|79up|ne:j63tvj|1
Kumo|kumo||NG|lh|rk0|25ih|2eir|ne:j64d9v|1
Kundian|kundian||PK|1f3|rbi|6yei|fbha|ne:j64bdx|1
Kundiawa|kundiawa||PG|dg|78n|-1ah2|v2io|ne:j63vxf|1
Kungur|kungur||RU|1d3|1f85|cb64|c7gn|ne:j64dgn|1
Kunming|kunming||CN|1wj|1qtko|5dgf|m09o|ne:j64mx7|1
Kununurra|kununurra||AU|1ve|4dr|-3dnm|rlb9|ne:j64k47|1
Kuopio|kuopio||FI|i4|1yws|dhan|5xp1|ne:j64fzn|1
Kupang|kupang||ID|1a1|61wc|-26jf|qhkm|ne:j64lq7|1
Kupina|kupina|kupino|RU|19q|clp|bnfs|gk92|ne:j645m1|1
Kupyansk|kupyansk|kupiansk|UA|ur|1ouu|annm|823x|ne:j649p3|1
Kuqa|kuqa|kuqa county|CN|1vs|a348|8xz1|hrxw|ne:j64jit|1
Kure|kure||JP|ol|47zz|7ca6|sevs|ne:j64exl|1
Kurgan|kurgan||RU|wo|7crd|bvxk|e07e|ne:j64j6n|1
Kurnool|kurnool||IN|33|93vc|3e58|gq30|ne:j64kpz|1
Kursk|kursk||RU|wp|8rx3|b388|7r8s|ne:j64j6f|1
Kurtamysh|kurtamysh||RU|wo|du8|brof|dt65|ne:j64c85|1
Kuruman|kuruman||ZA|19f|7py|-5vsw|50pk|ne:j64bil|1
Kushiro|kushiro||JP|oo|497q|97li|uy03|ne:j64lu3|1
Kuta|kuta|denpasar|ID|67|n5o|-1v8v|oorl|ne:j64e0j|1
Kütahya|kutahya||TR|x7|3yr4|8g60|6exw|ne:j644fp|1
Kutaisi|kutaisi||GE|q0|3xxl|9204|95pg|ne:j646z5|1
Kuujjuaq|kuujjuaq||CA|1fv|zd|cgaw|-ens0|ne:j64m2h|1
Kuujjuarapik|kuujjuarapik||CA|1fv|yj|bujz|-go1m|ne:j64m2f|1
Kuwait City|kuwait city|al kuwayt,kuwait|KW|1o|187tk|6amt|aa6s|ne:j64mwx|1
Kuybyshevskiy|kuybyshevskiy|kuybyshevsk|TJ|ut|6vx|851u|eq0a|ne:j649s7|1
Kuznetsk|kuznetsk||RU|1cz|21qu|bdvo|9zkg|ne:j64c5h|1
Kwekwe|kwekwe||ZW|13x|24i5|-4228|6dxs|ne:j64a57|1
Kwinana|kwinana|kwinana beach|AU|1ve|fhy|-6wre|otae|ne:j64i91|1
Kyakhta|kyakhta||RU|ah|e7z|asiv|mte7|ne:j64jaj|1
Kyaukphyu|kyaukphyu|kyaukpyu|MM|1g1|3ad|45wy|k1ty|ne:j64iqb|1
Kyiv|kyiv|kiev|UA|v4|1m2a0|at5t|6jgb|ne:j64n0n|1
Kyoto|kyoto||JP|wx|12oqw|7ib3|t3ft|ne:j64lu7|1
Kyrenia|kyrenia||||klp|7kks|7576|ne:j6408b|1
Kyshtym|kyshtym||RU|d2|13a7|bxs8|cza3|ne:j64c81|1
Kyustendil|kyustendil||BG|wy|13ej|929n|4v33|ne:j64i21|1
Kyzyl|kyzyl||RU|1ry|2bio|b2yz|k89j|ne:j64lkl|1
L'Aquila|l aquila|aquila|IT|5|1guv|92s0|2vbg|ne:j64dsp|1
L'Ariana|l ariana|aryanah|TN|122|23dj|7wgr|26pc|ne:j63t5n|1
La Asunción|la asuncion||VE|19v|r2k|2d4t|-doxd|ne:j640a1|1
La Barca|la barca||MX|qz|r9t|4chg|-lzcw|ne:j64cy3|1
La Ceiba|la ceiba||HN|52|34li|3dmn|-ilqa|ne:j64j1l|1
La Coruña|la coruna|a coruna|ES|kb|7xyq|9ac4|-1syw|ne:j64j1z|1
La Crosse|la crosse||US|1vm|1vf9|9dz2|-jk0a|ne:j642yx|1
La Cruz|la cruz||MX|1l5|96k|54kk|-mwug|ne:j64cvh|1
La Cruz|la cruz||CR|mc|3bz|2df4|-icq4|ne:j64e6z|1
La Esmeralda|la esmeralda||VE|2q|46|ohm|-e1re|ne:j64jwv|1
La Esperanza|la esperanza||HN|q8|43q|32le|-iwar|ne:j63thh|1
La Grande|la grande||US|1b3|bks|9pq7|-pb5u|ne:j641l1|1
La Grange|la grange|lagrange|US|ks|oio|72wt|-i83z|ne:j642jd|1
La Libertad|la libertad||GT|1d9|6o6|3lh8|-jbdc|ne:j64fcj|1
La Ligua|la ligua||CL|1t9|kkp|-6ygo|-f9ow|ne:j646vl|1
La Oroya|la oroya||PE|rt|pq9|-2gw0|-g9yg|ne:j644w3|1
La Palma|la palma||PA|g2|1f9|1ssu|-gqxm|ne:j64bqt|1
La Paloma|la paloma||UY|1gu|2hq|-7fik|-blz8|ne:j6413v|1
La Paz|la paz||BO|xi|y2uo|-3ja8|-elv3|ne:j64mql|1
La Paz|la paz||MX|63|42fb|569k|-nn8g|ne:j64llp|1
La Paz|la paz||HN|xi|djn|32hs|-isko|ne:j63thx|1
La Paz|la paz||AR|13o|3e8|-7685|-eh7w|ne:j64hb7|1
La Plata|la plata||AR|e6|evot|-7hd4|-cf80|ne:j64het|1
La Rioja|la rioja||AR|xj|3hh8|-6axf|-ebtg|ne:j64l2f|1
La Rochelle|la rochelle||FR|1e3|1net|9w83|-8vg|ne:j64kqh|1
La Romana|la romana||DO|xk|4gtx|3y3u|-es5e|ne:j64itx|1
La Ronge|la ronge||CA|1jo|2x3|bt5k|-mki0|ne:j647hj|1
La Sarre|la sarre||CA|1fv|5k6|agjk|-gz40|ne:j647nd|1
La Scie|la scie||CA|17t|mp|apjq|-bwvq|ne:j647o3|1
La Serena|la serena||CL|ey|3b89|-6epk|-f9ro|ne:j64lwj|1
La Unión|la union||SV|xm|kon|2uvc|-itrq|ne:j63wxj|1
La Unión|la union||CL|zt|kai|-8mvo|-fnys|ne:j646wn|1
La Vega|la vega||DO|xn|3hx9|449y|-f43y|ne:j646qv|1
La Victoria|la victoria||PY|2i|3uw|-4rzk|-cf2g|ne:j64b3p|1
Laascaanood|laascaanood|las anod|||1adg|1t2l|a53j|ne:j6405v|1
Laayoune|laayoune||MA|yg|414k|5tho|-2tuo|ne:j64lnx|1
Labasa|labasa||FJ|1vd|inv|-3io6|12g4p|ne:j64jpt|1
Labé|labe||GN|xp|30gv|2fcg|-2mwo|ne:j64kv3|1
Labinsk|labinsk||RU|wb|1bsp|9kek|8qdv|ne:j64c4n|1
Labrador City|labrador city||CA|17t|7yh|bchy|-ecbr|ne:j64m2l|1
Labutta|labutta||MM|5e|1ab|3gpf|kapy|ne:j64iql|1
Lac La Biche|lac la biche||CA|29|2ay|bqmf|-nzxb|ne:j647id|1
Ladysmith|ladysmith||ZA|wt|10jz|-64af|6ds8|ne:j64bnl|1
Lae|lae||PG|151|2t4c|-1fya|vi6k|ne:j64lhb|1
Lafayette|lafayette||US|zy|3e2u|6h0w|-jq13|ne:j64iyh|1
Lafayette|lafayette||US|q5|2vdl|8nv0|-imcu|ne:j642p3|1
Lafia|lafia||NG|172|2q6c|1tig|1tqo|ne:j64daj|1
Laghouat|laghouat||DZ|xu|2fv4|78vo|m80|ne:j64l4d|1
Lagos|lagos||NG|xv|5mw0g|1dqc|q5k|ne:j64n3b|1
Lagos de Moreno|lagos de moreno||MX|qz|20mn|4kw8|-luhw|ne:j64cy7|1
Laguna|laguna||BR|1j7|un3|-63r4|-age0|ne:j647cx|1
Lagunas|lagunas||CL|1pb|a|-4hwl|-exoh|ne:j64fqz|1
Lahad Datu|lahad datu||MY|1hg|29hy|12xs|pd34|ne:j64bhp|1
Lahat|lahat||ID|1nm|1euq|-tbk|m6v9|ne:j64kmb|1
Lahij|lahij||YE|xy|1f5c|2sra|9mbq|ne:j649h7|1
Lahore|lahore||PK|1f3|3wyug|6rj7|fxo9|ne:j64mut|1
Lahti|lahti||FI|1f8|2496|d2mr|5i15|ne:j64jrf|1
Laï|lai||TD|1p3|eye|20hq|3ht6|ne:j640ld|1
Laiwu|laiwu||CN|1ke|2nrg|7rbo|p7vc|ne:j64evj|1
Laiyang|laiyang||CN|1ke|5cwg|7x90|pve4|ne:j64jmb|1
Lajes|lajes|lages|BR|1j7|3j2c|-5ykw|-as70|ne:j64gu1|1
Lake Charles|lake charles||US|zy|1sod|6h88|-jz9o|ne:j641wl|1
Lake City|lake city||US|jp|moj|6gy1|-hpnh|ne:j642h3|1
Lake Havasu City|lake havasu city||US|48|17b9|7e6v|-oi0b|ne:j641cf|1
Lake Louise|lake louise||CA|29|yo|b0v5|-owh5|ne:j64gzl|1
Lake Minchumina|lake minchumina||US|26|w|dox8|-wn8y|ne:j643s5|1
Lakeville|lakeville||US|142|5lmk|9kit|-jzgp|ne:j648bp|1
Lalitpur|lalitpur||NP|85|78mx|5xh6|iafp|ne:j6457h|1
Lamar|lamar||US|ek|6ng|85vl|-lzte|ne:j648j3|1
Lamas|lamas||PE|1iq|akd|-1dm4|-gefk|ne:j644v1|1
Lambaréné|lambarene||GA|15e|jj2|-5ec|26ty|ne:j64flv|1
Lamia|lamia||GR|1mz|10ge|8c5a|4t3o|ne:j63y0z|1
Lampang|lampang||TH|y2|4dgx|3x50|lblp|ne:j649tj|1
Lamphun|lamphun||TH|y3|atq|3yrq|l8gk|ne:j63uxj|1
Lamu|lamu||KE|ec|ix9|-hgc|8rql|ne:j64kkz|1
Lancaster|lancaster||US|bd|4u87|7fqc|-pbji|ne:j64jtx|1
Lancaster|lancaster||US|1cy|4hn5|8kxm|-gcs2|ne:j64363|1
Lancaster|lancaster||US|1aj|11od|8ih4|-hpdx|ne:j642up|1
Lander|lander||US|1vp|59h|96i2|-nazi|ne:j641mf|1
Lạng Sơn|lang son||VN|xa|3674|4okc|mvqq|ne:j63taz|1
Langfang|langfang||CN|o3|hd00|8gyf|p0al|ne:j64jkx|1
Langsa|langsa||ID|7|2ih4|1028|kzww|ne:j64duf|1
Langzhong|langzhong||CN|1kv|1apq|6rn3|mpmw|ne:j64es5|1
Lankaran|lankaran||AZ|4p|1afo|8b10|agxr|ne:j64hol|1
Lansdowne House|lansdowne house|neskantaga first nation|CA|1av|3c|b6wm|-iu41|ne:j64l0l|1
Lansing|lansing||US|13u|600g|95qf|-i4d7|ne:j64j05|1
Lanxi|lanxi||CN|o5|1jyo|9wzs|r2co|ne:j64f3b|1
Lanzhou|lanzhou||CN|kg|1iw2w|7q84|m8ul|ne:j64mvt|1
Lao Chi|lao chi|lao cai|VN|10g|1fuu|4tme|ma7g|ne:j649yd|1
Laoag|laoag||PH|pw|4frc|3wf8|pui8|ne:j64lk3|1
Lapa|lapa||BR|1ch|jrp|-5irk|-anpw|ne:j647bl|1
Lappeenranta|lappeenranta||FI|1mc|19qk|d373|61gp|ne:j64fzt|1
Larache|larache||MA|1p5|2knm|7jlw|-1bj4|ne:j64br1|1
Laramie|laramie||US|1vp|ks6|8ure|-mmqq|ne:j64iy5|1
Laranjal do Jari|laranjal do jari||BR|2n|yq0|-6k4|-b8xs|ne:j64l0f|1
Laredo|laredo||US|1q4|9bgw|5w8l|-lbsw|ne:j64lat|1
Larissa|larissa|larisa|GR|1q8|2rcm|8hsg|4szs|ne:j64fuh|1
Larkana|larkana||PK|1l6|7sw1|5wo2|emac|ne:j64lgh|1
Larnaka|larnaka|larnaca|CY|ya|11rn|7hf6|77jc|ne:j6404z|1
Laryak|laryak||RU|uq|a|d3gk|h782|ne:j64cej|1
Las Cruces|las cruces||US|17p|2gv3|6xbq|-mvwi|ne:j648kj|1
Las Heras|las heras||AR|13o|1ffr|-71a2|-eqvl|ne:j647pv|1
Las Lajas|las lajas||AR|17h|xu|-896z|-f2ya|ne:j64hbh|1
Las Lomitas|las lomitas||AR|jq|5xf|-5al0|-czlc|ne:j64hi3|1
Las Palmas|las palmas|las palmas de gran canaria|ES||841r|60tk|-3b24|ne:j64m7b|1
Las Plumas|las plumas||AR|dx|gt|-9b03|-eewk|ne:j64hal|1
Las Tablas|las tablas||PA|zu|8ri|1nvo|-h7g0|ne:j64bqj|1
Las Tunas|las tunas|victoria de las tunas|CU|yb|4d5w|4hq9|-ghs8|ne:j64e87|1
Las Vegas|las vegas||US|17j|132mw|7rev|-op24|ne:j64m8j|1
Las Vegas|las vegas||US|17p|d46|7mo2|-mjwh|ne:j641ix|1
Lascano|lascano||UY|1gu|5ds|-77so|-bm7k|ne:j648b3|1
Lashkar Gah|lashkar gah||AF|oi|4bii|6rp2|dsls|ne:j63z63|1
Lata|lata||SB|1pz|fd|-2aus|zjrb|ne:j64bv5|1
Latacunga|latacunga|la tacunga|EC|f7|21a4|-768|-guk4|ne:j64e3f|1
Latakia|latakia|al ladhiqiyah|SY|yd|bk0b|7m88|7o2w|ne:j643gb|1
Latur|latur||IN|11a|80vu|3xz8|getg|ne:j64jpd|1
Launceston|launceston||AU|1pl|1jwq|-8vtu|vj9i|ne:j64k77|1
Laurel|laurel||US|149|m95|6sku|-j3sx|ne:j642kf|1
Lausanne|lausanne||CH|1tg|5p0m|9z14|1fb8|ne:j64au1|1
Lautoka|lautoka||FJ|1vd|174m|-3rxd|121ca|ne:j64flp|1
Laverton|laverton||AU|1ve|8s|-64vy|q8h4|ne:j64k4z|1
Lavras|lavras||BR|141|1qv4|-4jyo|-9nas|ne:j64gq5|1
Lavrentiya|lavrentiya||RU|dy|yi|e21l|-10nmy|ne:j645a3|1
Lawrence|lawrence||US|t2|1zjq|8cm6|-kezs|ne:j641px|1
Lawton|lawton||US|1ao|1yso|7eyu|-l3c4|ne:j648qx|1
Lázaro Cárdenas|lazaro cardenas||MX|13v|3fiv|3ukj|-lwkw|ne:j64cyf|1
Le Havre|le havre||FR|o0|56to|alze|t6|ne:j64lw7|1
Le Mans|le mans||FR|1cr|33ib|aadg|rs|ne:j64fnf|1
Lead|lead||US|1m9|27u|9i7o|-m8nu|ne:j641vp|1
Lebowakgomo|lebowakgomo||ZA|z5|pp8|-56q4|6bmg|ne:j64bn5|1
Lebu|lebu||CL|ay|h8p|-8274|-fsac|ne:j64fsz|1
Lecce|lecce||IT|3m|3hg6|8nf8|3w1o|ne:j64drv|1
Leeds|leeds|west yorkshire|GB|1vc|wrs8|bjdc|-c7g|ne:j64j2p|1
Leesburg|leesburg||US|jp|1292|66ax|-hjtd|ne:j642gl|1
Leeton|leeton||AU|17q|5mr|-7ejt|vdlx|ne:j64iaz|1
Leeuwarden|leeuwarden||NL|ju|2p1u|bevs|18mi|ne:j64bap|1
Legazpi|legazpi||PH|28|6uz5|2tmc|qiv0|ne:j64j8p|1
Leh|leh||IN|xs|nti|7blc|gmjv|ne:sm0fux|1
Lehututu|lehututu||BW|ul|1hy|-54y8|4or0|ne:j64i4x|1
Leicester|leicester||GB|yi|9tdr|ba3g|-8qs|ne:j644lp|1
Leikanger|leikanger|hermansverk|NO|1ln|1il|d43d|1gus|ne:j63vot|1
Leipzig|leipzig||DE|1hj|bmm9|b03u|2nr8|ne:j64eod|1
Leiria|leiria||PT|yj|yt4|8imm|-1vxu|ne:j63vcn|1
Lemosos|lemosos|lemesos,limassol|CY|z1|3ats|7fk2|72vx|ne:j64is7|1
Lemsid|lemsid|lamssid|MA|xo|2s|5oui|-2yuq|ne:j64dlf|1
Lenger|lenger||KZ|1md|hsi|91jf|ez73|ne:j6464f|1
Leninobod|leninobod||TJ|yl|8uk|8ipo|eseo|ne:j640e3|1
Leninogorsk|leninogorsk||RU|1pn|1f4n|bpab|b8p3|ne:j645kn|1
Leninsk Kuznetsky|leninsk kuznetsky||RU|uc|2c4f|bprc|igw4|ne:j645l1|1
Lensk|lensk||RU|1hy|jqt|d0k5|omxq|ne:j64ll5|1
Leo|leo||BF|1ld|kqs|2dlo|-g6s|ne:j63zwx|1
León|leon|leon de los aldama,leon de los aldamas|MX|md|vw5c|4j7j|-lsqk|ne:j64lmh|1
León|leon||NI|yr|3ivt|2nyc|-imd6|ne:j64j3t|1
León|leon||ES|c3|2x43|94js|-16z8|ne:j643fh|1
Leonara|leonara|leonora|AU|1ve|6b|-66un|q068|ne:j64k4x|1
Leopoldina|leopoldina||BR|141|102e|-4m4k|-950g|ne:j6475x|1
Lerwick|lerwick||GB|2|536|cw4c|-8vg|ne:j64k7b|1
Les Cayes|les cayes||HT|1n7|3rdt|3wfo|-ft24|ne:j64abd|1
Leshan|leshan||CN|1kv|osqw|6c5m|m8ea|ne:j64jk7|1
Lesosibirsk|lesosibirsk||RU|wc|1evt|chep|jtlt|ne:j64j9x|1
Lesozavodsk|lesozavodsk||RU|1eq|w8i|9qvw|slju|ne:j64jbf|1
Lethbridge|lethbridge||CA|29|1ihl|anhp|-o6ml|ne:j64gzf|1
Lethem|lethem||GY|1si|9s|q5o|-ctf4|ne:j6449v|1
Leticia|leticia||CO|2q|19yv|-wf0|-ezs1|ne:j64mmz|1
Letpadan|letpadan|letpandan|MM|5z|3s8r|3t7f|kiqv|ne:j64ipj|1
Levin|levin||NZ|11q|f32|-8pd8|11kg4|ne:j64n4l|1
Lewiston|lewiston||US|11d|18ig|9ga7|-f1s9|ne:j649al|1
Lewiston|lewiston||US|pq|1215|9y5i|-p2wm|ne:j64jtj|1
Lexington|lexington||US|uf|5o5e|85lg|-i408|ne:j64jw1|1
Lezhë|lezhe||AL|yq|efb|8yfs|47ng|ne:j63ywz|1
Lgov|lgov||RU|wp|i4s|b2vo|7k6g|ne:j64c1b|1
Lhasa|lhasa||CN|1vt|4pfz|6cqq|jixk|ne:j64mjj|1
Lhokseumawe|lhokseumawe||ID|7|309u|1422|ktjr|ne:j64kk5|1
Lianxian|lianxian|lianzhou|CN|me|4d4n|5b7r|o35d|ne:j64dyh|1
Lianyungang|lianyungang||CN|re|fc5s|7ez8|pjis|ne:j64ex3|1
Liaocheng|liaocheng||CN|1ke|4v3m|7t3k|outw|ne:j64evt|1
Liaoyang|liaoyang||CN|ys|h0nk|8uj7|qeg5|ne:j64jll|1
Liaoyuan|liaoyuan||CN|rj|auus|970o|qtic|ne:j64jmz|1
Libenge|libenge||CD|1xr|kvh|s8s|3zo8|ne:j64ect|1
Liberec|liberec||CZ|yt|26u7|avz4|38cw|ne:j646hl|1
Liberia|liberia||CR|mc|z0k|2a1u|-ib7h|ne:j64e6v|1
Libertador General San Martín|libertador general san martin||AR|rr|120j|-53sj|-dvx8|ne:j64hgj|1
Librazhd|librazhd||AL|ij|9sj|8twg|4d5f|ne:j63ytx|1
Libreville|libreville||GA|j2|ce3w|2z2|20z8|ne:j64mkh|1
Lichinga|lichinga||MZ|171|2cr3|-2umg|7jww|ne:j64kc7|1
Lida|lida||BY|oy|25bs|bjt1|5f3i|ne:j64i3x|1
Liège|liege||BE|yv|g20m|aunw|1720|ne:j6488d|1
Liepaga|liepaga|liepaja|LV|yw|1tos|c418|4i44|ne:j64j4h|1
Liestal|liestal||CH|72|9wg|a6dq|1np6|ne:j63wcl|1
Ligonha|ligonha||MZ|16p|2p8|-393h|837c|ne:j64bl5|1
Lihue|lihue||US|o1|bzk|4plz|-y5pq|ne:j648cz|1
Lijiang|lijiang||CN|1wj|e8d|5qsg|lhnu|ne:j64jkn|1
Likasi|likasi||CD|tw|9b6w|-2cn8|5qmw|ne:j64kp5|1
Lille|lille||FR|18q|mdk0|autz|nr1|ne:j64jq3|1
Lillehammer|lillehammer||NO|1ax|f2u|d3ph|290o|ne:j64kbj|1
Lillooet|lillooet||CA|9t|28d|av2t|-q4ud|ne:j64h17|1
Lilongwe|lilongwe||MW|yz|dv1a|-2zw9|78o9|ne:j64mkb|1
Lima|lima||PE|z0|4rq3k|-2ky5|-gijc|ne:j64n13|1
Lima|lima||US|1aj|1gr0|8qdh|-i0yl|ne:j6493p|1
Limbe|limbe||CM|1nc|4jy2|v3k|1yws|ne:j64h8v|1
Limeira|limeira||BR|1o6|67i9|-4tzr|-a5qo|ne:j64hj7|1
Limerick|limerick||IE|z3|1xhi|bad3|-1uja|ne:j64kjh|1
Limoges|limoges||FR|z4|39fr|9tmk|9n8|ne:j64jq1|1
Limón|limon|puerto limon|CR|z6|1tl5|255s|-hsot|ne:j64lqh|1
Linares|linares||CL|139|1qif|-7ojk|-fce4|ne:j646yb|1
Linares|linares||ES|31|1a41|85up|-s1a|ne:j643ep|1
Linares|linares||MX|19x|18jn|5bto|-lcac|ne:j64cwz|1
Linchuan|linchuan||CN|rf|561c|5ztj|oxu8|ne:j64ew5|1
Lincoln|lincoln||US|17a|59zg|8qyw|-kpzk|ne:j64jul|1
Lincoln|lincoln||AR|e6|j4u|-7h4w|-d6uf|ne:j647sx|1
Linden|linden||GY|1sm|yhe|1a7w|-chm4|ne:j64j1p|1
Lindi|lindi||TZ|z7|wc8|-255s|8ibs|ne:j64kid|1
Linfen|linfen||CN|1kg|hvio|7qev|nwh9|ne:j64jjf|1
Lingyuan|lingyuan|lianyungang|CN|ys|h9ww|8u83|plag|ne:j64kof|1
Linhai|linhai||CN|1x7|5e9b|66lw|pykg|ne:j646lp|1
Linhares|linhares||BR|iy|292r|-45m4|-8l10|ne:j64kyd|1
Linjiang|linjiang||CN|rj|1t23|8yt7|r7g0|ne:j64ez5|1
Linköping|linkoping||SE|1y1|22n0|cip0|3cln|ne:j64k85|1
Linkou|linkou||CN|o5|1nzu|9peb|rx13|ne:j646ox|1
Linqing|linqing||CN|o3|2cwu|7wc8|oslc|ne:j64etn|1
Linxi|linxi|linxi town|CN|17d|iv|9bs3|par1|ne:j64f0b|1
Linxia|linxia|linxia city|CN|kg|bggr|7mow|m4ao|ne:j6469h|1
Linyi|linyi|linyi shandong|CN|1ke|18mhc|7ioz|pd0w|ne:j64lsv|1
Linz|linz||AT|1a7|7hex|acu0|3294|ne:j64i2t|1
Lipetsk|lipetsk||RU|z8|b1vr|ba0o|8hv4|ne:j64kel|1
Lira|lira||UG|z9|2wid|hfw|71s4|ne:j64am1|1
Lisala|lisala||CD|1xr|1i2v|gig|4lz0|ne:j64kmz|1
Lisbon|lisbon||PT|za|1o9r4|8asv|-1yks|ne:j64muh|1
Lisburn|lisburn||GB|ho|9yb|book|-1fgs|ne:j64ad1|1
Lishui|lishui||CN|1x7|3pbd|63iw|pp5k|ne:j64ex7|1
Lismore|lismore||AU|17q|o92|-66cn|wutf|ne:j64k5j|1
Lithgow|lithgow||AU|17q|8l4|-76gh|w6l4|ne:j64ibz|1
Little Current|little current|northeastern manitoulin and the islands|CA|1av|18b|9uom|-hk79|ne:j64h2x|1
Little Rock|little rock||US|49|5t0t|7g0x|-jsfj|ne:j64iy7|1
Liuhe|liuhe||CN|rj|1h6y|9285|qy1h|ne:j64eyn|1
Liupanshui|liupanshui|lupanshui|CN|mp|q64o|5p7w|mgvu|ne:j64lp7|1
Liuzhou|liuzhou||CN|mf|w33c|57cz|neyp|ne:j64jgf|1
Liverpool|liverpool||GB|13p|hdrs|bg6b|-mj3|ne:j64j2b|1
Liverpool|liverpool||CA|19o|3cb|9ftc|-dvds|ne:j647nl|1
Livingston|livingston||GT|qt|b2m|3e5f|-j0ui|ne:j646qh|1
Livingstone|livingstone||ZM|1mm|3joo|-3tt4|5jjc|ne:j64ldd|0
Livny|livny||RU|1b4|14tv|b8ig|825o|ne:j64c27|1
Livorno|livorno||IT|1r5|3cky|9c1j|27hr|ne:j64dqv|1
Ljubljana|ljubljana||SI|1bh|6qwn|9vd5|33zy|ne:j64lg5|1
Llallagua|llallagua||BO|1eg|lnp|-3y4o|-ea74|ne:j6485b|1
Llica|llica||BO|1ef|fd|-495s|-emmc|ne:j64hvl|1
Lobamba|lobamba||SZ|124|7jq|-5o7v|6oqo|ne:j64j1j|1
Lobatse|lobatse||BW|1mj|1hv0|-5elg|5i5c|ne:j64i6h|1
Lobito|lobito||AO|7w|4gfw|-2ng4|2whg|ne:j64l3h|1
Lobos|lobos||AR|e6|e3q|-7jhl|-cnz7|ne:j64hef|1
Lodja|lodja||CD|tm|1gno|-qxc|50pk|ne:j64fa5|1
Lodwar|lodwar||KE|1gi|fln|o5k|7mgk|ne:j64b9d|1
Łódź|lodz||PL|10k|g8vk|b3ih|462m|ne:j64kht|1
Loei|loei||TH|ze|r7t|3qyv|lsyr|ne:j649xv|1
Logan|logan||US|1sv|1jxm|8y1b|-nyww|ne:j648m7|1
Logashkino|logashkino||RU|1hy|0|f6oo|wzi0|ne:j64cpp|1
Logroño|logrono||ES|xj|32vm|93pc|-ir0|ne:j64a8v|1
Loikaw|loikaw||MM|u0|dcd|47qi|ku1o|ne:j63zn3|1
Loja|loja||EC|zi|2pi8|-usc|-gz6s|ne:j64kmn|1
Lokhwabe|lokhwabe|lokgwabe|BW|ul|14x|-56hs|4ofw|ne:j64i4t|1
Lokoja|lokoja||NG|vq|1aqr|1o6s|1g07|ne:j64dab|1
Lokossa|lokossa||BJ|14m|1v3v|1f1i|d8e|ne:j63zgf|1
Lomé|lome||TG|12g|v4dc|1bbv|9f4|ne:j64m9z|1
Loncoche|loncoche||CL|xd|c12|-8fs4|-fkf0|ne:j646vz|1
London|london||GB|1vi|53mc8|b1e3|-wz|ne:j64n2x|1
London|london||CA|1av|7fkd|97k4|-hexg|ne:j647kv|1
London|london||US|uf|61w|7yhl|-i0si|ne:j642r1|1
Londonderry/Derry|londonderry derry|londonderry|GB|gf|1sjo|bsdw|-1kl1|ne:j64acx|1
Londrina|londrina||BR|1ch|b5f2|-4zs8|-aywo|ne:j64kxj|1
Long Beach|long beach||US|bd|17n3a|78pa|-pbpo|ne:j64ixj|1
Long Xuyen|long xuyen||VN|2u|7i28|283g|mlfc|ne:j64a0n|1
Longjiang|longjiang||CN|o5|2a34|a5a4|qego|ne:j64f2d|1
Longreach|longreach||AU|1fn|28e|-50xs|ux1g|ne:j64ijn|1
Longview|longview||US|1q4|1mkw|6yrx|-kb0r|ne:j641yv|1
Longview|longview||US|1ux|1f3r|9w0b|-qcl6|ne:j648eb|1
Longxi|longxi||CN|kg|7ly5|7ifg|mfei|ne:j64duj|1
Longyan|longyan||CN|jy|7vvc|5eak|p30c|ne:j64dwf|1
Longyearbyen|longyearbyen||SJ|1nw|y8|griv|3bzg|ne:j64j41|0
Lonquimay|lonquimay||CL|xc|7wd|-88jx|-f9n1|ne:j646wb|1
Lop Buri|lop buri|lopburi,thahanbok lop buri|TH|zl|18kh|3688|lkdm|ne:j649ux|1
Lorca|lorca||ES|1gc|1ug7|82t2|-d3t|ne:j64a85|1
Lorengau|lorengau||PG|123|4ha|-fog|vkf4|ne:j63vz3|1
Loreto|loreto||MX|63|8nv|5kpx|-nv71|ne:j645qv|1
Lorica|lorica|santa cruz de lorica|CO|fp|14pv|1zb7|-g900|ne:j64e5j|1
Lorient|lorient||FR|9q|1tjs|a8g0|-pz6|ne:j64fn3|1
Los Alamos|los alamos||US|17p|9ft|7oxr|-ms75|ne:j64ju5|1
Los Andes|los andes||CL|1t9|17vf|-71bc|-f4r4|ne:j64fs7|1
Los Angeles|los angeles|los angeles long beach santa ana|US|bd|7fx28|7aa7|-pbwb|ne:j64n2p|1
Los Angeles|los angeles||CL|ay|342f|-811k|-fic0|ne:j64lwl|1
Los Blancos|los blancos||AR|1i5|vt|-523g|-df0w|ne:j64hgx|1
Los Lagos|los lagos||CL|zr|9vx|-8jhb|-flyk|ne:j64fsp|1
Los Mochis|los mochis||MX|1l5|5c5z|5izw|-nd1s|ne:j64je3|1
Los Teques|los teques||VE|gw|6i5q|28eg|-ed4o|ne:j6437n|1
Lota|lota||CL|ay|12eb|-7y6o|-foi8|ne:j64fsv|1
Louang Namtha|louang namtha|luang namtha|LA|zv|2hl|4hng|lqjb|ne:j63y71|1
Louangphrabang|louangphrabang|luang prabang|LA|zw|2ao6|49fh|lw4o|ne:j64dhn|1
Loubomo|loubomo|dolisie|CG|17y|285y|-w90|2prg|ne:j64gh5|1
Louga|louga||SN|zx|1tn7|3cg8|-3hdw|ne:j64b6h|1
Louisville|louisville||US|uf|kbhc|86ym|-idnm|ne:j64jvz|1
Lovec|lovec|lovech|BG|100|wkj|98us|5aqe|ne:j63zjj|1
Lowell|lowell||US|12y|fict|94yp|-faa7|ne:j648wj|1
Lower Hutt|lower hutt||NZ|1v0|270g|-8txh|11hmr|ne:j64n6h|1
Luan|luan|liuan,lu an|CN|36|1080g|6t03|oyr1|ne:j64jgv|1
Luan Chau|luan chau||VN|1tu|5nr|4nqw|m5ee|ne:j63ta3|1
Luanda|luanda||AO|103|32vfo|-1w6j|2u3p|ne:j64mzx|1
Luangwa|luangwa||MZ|1q2|2d5|-3cis|6in8|ne:j64bjl|1
Luanshya|luanshya||ZM|ew|39a1|-2tc5|634w|ne:j64jzf|1
Luanza|luanza||CD|tw|nx|-1v4k|65g8|ne:j64fan|0
Luau|luau||AO|15a|e8x|-2amv|4rj0|ne:j64hu1|0
Luba|luba||GQ|8d|6of|qmc|1tz0|ne:j63x6f|1
Lubango|lubango||AO|pc|2oxs|-371o|2w38|ne:j64m4d|1
Lubao|lubao||CD|tm|x8c|-15l4|5ios|ne:j64f9t|1
Lubbock|lubbock||US|1q4|4kl0|773s|-lu40|ne:j64iyx|1
Lübeck|lubeck||DE|1jw|51mm|bjo0|2abw|ne:j64elz|1
Lublin|lublin||PL|105|7pt8|azg8|4u67|ne:j64dg7|1
Lubumbashi|lubumbashi|lumumbashi|CD|tw|sz7k|-2i3x|5w0t|ne:j64mk7|1
Lubutu|lubutu||CD|11y|10h|-5nl|5p49|ne:j64f9j|1
Lucapa|lucapa||AO|10b|ny9|-1sys|4g14|ne:j64hrh|1
Lucea|lucea||JM|nm|4up|3yb2|-gr8e|ne:j63wzj|1
Lucknow|lucknow||IN|1sy|1lrh4|5r8a|hcbv|ne:j64lz7|1
Lüderitz|luderitz||NA|tb|boh|-5pm8|38yy|ne:j64lnf|1
Ludhiana|ludhiana||IN|1f3|zcdk|6mnl|g9f3|ne:j64lyx|1
Luebo|luebo||CD|tl|r5b|-159z|4l78|ne:j64f83|1
Luena|luena||AO|15a|gaj|-2iz0|49js|ne:j64l3l|1
Lufkin|lufkin||US|1q4|xds|6pt4|-kaxl|ne:j648tp|1
Luga|luga||RU|ym|uya|cl7n|6e8m|ne:j64byd|1
Lugano|lugano||CH|1qg|29bg|9uxw|1x6r|ne:j649hh|0
Luganville|luganville||VU|1j3|ac5|-3bp2|ztxy|ne:j64a6j|1
Luhansk|luhansk|luhans k|UA|109|9ork|aerm|8fi8|ne:j649pd|1
Luiana|luiana||AO|fd|46|-3q0v|4xgw|ne:j64htb|1
Luján|lujan||AR|e6|1r2t|-7etg|-co3g|ne:j64hf1|1
Lukulu|lukulu||ZM|1vd|2l1|-3314|4zbk|ne:j64a4d|1
Luleå|lulea||SE|18w|11j2|e25a|4qz4|ne:j64lef|1
Lüleburgaz|luleburgaz||TR|vf|1y4z|8vhv|5v2o|ne:j644f7|1
Lumbala Nguimbo|lumbala nguimbo|lumbala ngimbo|AO|15a|p|-30sk|4lfk|ne:j64hud|1
Lumberton|lumberton||US|18z|pap|7f6o|-gxnr|ne:j642sv|1
Lumphat|lumphat||KH|1ha|eth|2w7y|mxgy|ne:j63zez|1
Lundazi|lundazi||ZM|i2|8z7|-2mtr|73xw|ne:j64a37|1
Luohe|luohe||CN|o6|8y18|7710|ofv0|ne:j646kt|1
Luoyang|luoyang||CN|o6|10raw|7flv|o3t5|ne:j64jlj|1
Lusaka|lusaka||ZM|10d|sgow|-3axv|627y|ne:j64maz|1
Lusambo|lusambo||CD|tm|vyg|-12cg|50sc|ne:j64f9x|1
Lusanga|lusanga||CD|6j|4x|-172t|3jfz|ne:j64f7d|1
Lushnjë|lushnje||AL|jk|vzx|8rw8|484o|ne:j63yoj|1
Luton|luton||GB|10e|522e|b4b8|-38o|ne:j64aix|1
Lutselke|lutselke|lutselk e|CA|19k|2u|ddhd|-nqf9|ne:j647jf|1
Lutsk|lutsk|kovel|UA|1ud|4kv1|avkg|5fh2|ne:j649nz|1
Luuq|luuq||SO|ko|q3g|tbp|94bg|ne:j64bw7|1
Luwuk|luwuk||ID|1ni|10v6|-790|qbgc|ne:j64dnt|1
Luxembourg|luxembourg||LU|10f|2arg|amt1|1bas|ne:j64j45|1
Luxor|luxor||EG|1ff|d23k|5iaw|6zxg|ne:j64mjb|1
Luzern|luzern|lucerne|CH|108|5cwg|a31k|1rw0|ne:j649hd|1
Luzhou|luzhou||CN|1kv|wxyg|66ur|ml3p|ne:j64jkh|1
Lviv|lviv|l viv,lvov|UA|x9|h8a0|aoj2|55f0|ne:j64lcb|1
Lynchburg|lynchburg||US|1u5|285x|80oo|-gyo1|ne:j64jwj|1
Lynn Lake|lynn lake||CA|121|de|c6no|-lnpg|ne:j64k1d|1
Lyon|lyon||FR|1gg|uhzs|9t6g|1195|ne:j64mil|1
Lysychansk|lysychansk||UA|109|2o05|ahh0|88ia|ne:j649p7|1
M'sila|m sila||DZ|10l|37qo|7ngo|z2i|ne:j63zi3|1
Ma'an|ma an||JO|10p|12um|6gyo|7nqo|ne:j63wo1|1
Maanshan|maanshan|ma anshan|CN|36|ta8u|6su0|pe74|ne:j64dxl|1
Maastricht|maastricht||NL|z2|2mfe|awdu|17sy|ne:j63vld|0
Mabaruma|mabaruma||GY|6x|2ak|1r9s|-ct9k|ne:j64k1v|1
Macaé|macae||BR|1gm|32d1|-4soo|-8ygc|ne:j647g5|1
Macapá|macapa||BR|2o|ap5q|96|-axwk|ne:j64moh|1
Macará|macara||EC|zi|a23|-xsk|-h4wc|ne:j64e35|0
Macas|macas||EC|153|i9z|-htk|-gqs0|ne:j64e45|1
Macau|macau||MO||c6t8|4rbi|oc4a|ne:j64l5p|1
Maceió|maceio||BR|24|pf4g|-227o|-7npj|ne:j64m13|1
Macenta|macenta||GN|1a4|x9a|1tz4|-215c|ne:j64gj1|1
Machakos|machakos||KE|i2|33tp|-bnb|7zi0|ne:j64b8v|1
Machala|machala||EC|ie|4kdm|-p5k|-h4z4|ne:j64kml|1
Macheng|macheng||CN|p6|2pi6|6ol4|onks|ne:j64jjt|1
Machilipatnam|machilipatnam||IN|33|44sb|3h04|hee0|ne:j64fih|1
Machinga|machinga||MW|10r|13e|-37hf|7m1r|ne:j63xdp|1
Machiques|machiques||VE|1xi|1cl4|25pc|-fjsr|ne:j648vx|1
Macia|macia||MZ|kl|hv8|-5d1v|73bo|ne:j64blx|1
Mackay|mackay||AU|1fn|1mky|-4j5b|vyuk|ne:j64k73|1
Macon|macon||US|ks|2h6w|71h4|-hxak|ne:j648zf|1
Madang|madang||PG|10s|1buv|-14bc|v8vx|ne:j64kd3|1
Madaoua|madaoua||NE|1op|j50|30m2|19z6|ne:j64ax1|1
Madinat ath Thawrah|madinat ath thawrah|al thawrah|SY|3u|1vt4|7oin|89ft|ne:j643gl|1
Madingou|madingou||CG|99|hk8|-w4o|2wl0|ne:j63y0p|1
Madison|madison||US|1vm|70nr|98cq|-j5tn|ne:j64izv|1
Madisonville|madisonville||US|uf|h7a|8027|-ir66|ne:j642rd|1
Madiun|madiun||ID|r6|3zlf|-1mwq|nwge|ne:j64e1j|1
Madrid|madrid||ES|eq|3bbiw|8nqs|-sfp|ne:j64n0v|1
Madurai|madurai||IN|1p2|rqgg|24k4|gqrh|ne:j64mmj|1
Mae Hong Son|mae hong son||TH|10x|711|44xe|kzxm|ne:j63uu1|0
Mae Sot|mae sot||TH|1ov|zbp|3kze|l4ks|ne:j649uj|1
Maebashi|maebashi||JP|mr|7e3r|7st3|tt3b|ne:j646ph|1
Mafetang|mafetang|mafeteng|LS|10z|180z|-6e2e|5u9g|ne:j64kvd|1
Magadan|magadan||RU|111|21iq|crom|wbno|ne:j64mfx|1
Magangué|magangue||CO|90|25eh|1z7w|-g0p4|ne:j646ed|1
Magdagachi|magdagachi||RU|2t|923|bgf8|qyog|ne:j64jap|1
Magdalena|magdalena|magdalena de kino|MX|1lw|i0v|6k8m|-nsv8|ne:j645sz|1
Magdalena|magdalena||BO|id|2np|-2ubd|-dq8g|ne:j64hcb|1
Magdeburg|magdeburg||DE|1hk|4xc2|b68o|2hns|ne:j64eo7|1
Magelang|magelang||ID|r5|2e05|-1lmw|nm5k|ne:j64dzt|1
Magnitogorsk|magnitogorsk||RU|d2|8uxz|bg7n|cn3c|ne:j64liv|1
Magong|magong|makung|TW|1cx|17jn|51ub|pmpl|ne:j64m7v|1
Magta Lajar|magta lajar|magta lahjar|MR|9k|a|3n6c|-2w60|ne:j64d41|1
Magway|magway||MM|115|2p79|4bfp|kcek|ne:j64k7n|1
Maha Sarakham|maha sarakham||TH|116|13sw|3gvk|m51w|ne:j63v6p|1
Mahabad|mahabad||IR|1v1|3hc2|7vq0|9ss0|ne:j64g7n|1
Mahajanga|mahajanga||MG|118|3bc1|-3cws|9xlm|ne:j64lpv|1
Mahalapye|mahalapye||BW|cd|135k|-4y8o|5qy0|ne:j64m51|1
Mahdia|mahdia||TN|11b|zh5|7lsn|2d6x|ne:j63t7t|1
Mahilyow|mahilyow|mogilev|BY|11c|7wvk|bjvt|6hzj|ne:j64i3j|1
Mahmud-E Eraqi|mahmud e eraqi|mahmud i raqi|AF|t5|5pr|7i6v|euz9|ne:j63z9j|1
Maiduguri|maiduguri||NG|96|j7cw|2jg7|2tj1|ne:j64lmj|1
Maintirano|maintirano||MG|118|4kl|-3vei|9fmv|ne:j64klh|1
Mainz|mainz||DE|1ge|3yqt|apo1|1ru4|ne:j640lt|1
Maiquetía|maiquetia||VE|1tc|6rea|29sk|-ecqs|ne:j6499h|1
Maitland|maitland||AU|17q|edd|-70h6|whem|ne:j64icd|1
Maitri Station|maitri station|maitri|AQ||1t|-f65q|2iih|ne:j64ivt|1
Maizuru|maizuru||JP|wx|1zch|7ljc|t08l|ne:j64f5f|1
Majene|majene||ID|1ng|5u61|-r9k|phy4|ne:j64e2t|1
Majuro|majuro||MH||jlk|1it2|10qdk|ne:j64l53|1
Makale|makale||ID|1nh|7oo|-nw8|posj|ne:j64e2b|1
Makamba|makamba||BI|11e|f5m|-vw5|6dxs|ne:j63zqt|1
Makarov|makarov||RU|1hz|553|af9d|uluo|ne:j64csh|1
Makassar|makassar|kota makassar,ujung pandang|ID|1nh|r1rk|-13n8|plj1|ne:j64mij|1
Makeni|makeni||SL|19d|1vnj|1wis|-2kz8|ne:j64b65|1
Makhachkala|makhachkala|machackala|RU|ft|bw85|97mw|a6ig|ne:j64j8d|1
Makhambet|makhambet||KZ|55|6vd|a7u2|b1zq|ne:j64g15|1
Makinsk|makinsk||KZ|3q|hrg|ba6c|f3ac|ne:j64g21|1
Makiyivka|makiyivka|makiivka|UA|h9|82le|aall|850i|ne:j6440b|1
Makkah|makkah|mecca|SA|11f|too8|4ldc|8j8l|ne:j64mun|1
Makokou|makokou||GA|1ad|d66|4dj|2ra2|ne:j64ffx|1
Makoua|makoua||CG|fl|8rf|-2o|3cog|ne:j64ggt|1
Makurdi|makurdi||NG|7z|69t1|1nn8|1ttg|ne:j64lmn|1
Malabo|malabo||GQ|8c|3ccb|sxo|1vrt|ne:j64mj7|1
Malacca|malacca|melaka,melaka city|MY|13m|gwki|h0w|lwxt|ne:j64kkf|1
Maladzyechna|maladzyechna|maladziecna|BY|143|265w|bn4k|5ral|ne:j6487p|1
Málaga|malaga||ES|31|bsfe|7vc4|-y3s|ne:j649ch|1
Malakal|malakal||SS|1sk|3g1p|21l5|6s9c|ne:j64lfv|1
Malang|malang||ID|r6|h954|-1pk4|o4w1|ne:j64lq5|1
Malanje|malanje|malange|AO|11g|2p40|-21m0|3i2w|ne:j64m47|1
Malargüe|malargue||AR|13o|953|-7lnp|-ewwp|ne:j64haz|1
Malatya|malatya||TR|11h|9w5i|882g|87iw|ne:j64afb|1
Malayer|malayer||IR|nh|3s8t|7ctc|agxg|ne:j6470v|1
Maldonado|maldonado||UY|11j|16t2|-7hd8|-bs2o|ne:j6412j|1
Malé|male||MV||2f4v|w5f|fr4n|ne:j64msh|1
Malegaon|malegaon||IN|11a|et24|4en8|fz1e|ne:j64fkv|1
Mali|mali||GN|xp|487|2l8o|-2mwy|ne:j63ycx|1
Malindi|malindi||KE|ec|20jk|-oro|8lew|ne:j64kl1|1
Mallawi|mallawi||EG|1t|4npx|5xyw|6lyo|ne:j64egx|1
Malmö|malmo||SE|1li|5rtx|bwvt|2skd|ne:j64lnv|1
Maltahöhe|maltahohe||NA|no|1sp|-5bo0|3mpk|ne:j64khz|1
Mamou|mamou||GN|11n|1iwh|283g|-2ld4|ne:j64gij|1
Man|man||CI|gz|35em|1l3o|-1m98|ne:j64gjj|1
Manacapuru|manacapuru||BR|2q|19lq|-pds|-czqw|ne:j64glz|1
Manado|manado||ID|1nk|9ool|bf4|qrck|ne:j64kj3|1
Managua|managua||NI|11p|jpvk|2lse|-iho0|ne:j64mcf|1
Manama|manama||BH||c34g|5mft|auav|ne:j64m7n|1
Mananjary|mananjary||MG|jj|ld2|-4jpj|acxx|ne:j64klf|1
Manaus|manaus||BR|2q|11kmg|-nwl|-cuz8|ne:j64mn1|1
Manbij|manbij||SY|2a|2kq1|7tua|84vf|ne:j643hf|1
Manchester|manchester||GB|11r|1bsog|bgts|-hcz|ne:j64l6n|1
Manchester|manchester||US|17m|47o6|97rc|-fbcp|ne:j648wt|1
Mandalay|mandalay||MM|11s|rv34|4pjb|kldr|ne:j64m6v|1
Mandalgovi|mandalgovi||MN|hn|2aw|9t0c|mryc|ne:j64jfl|1
Mandali|mandali||IQ|h0|mzd|78d8|9rfs|ne:j6471f|1
Mandera|mandera||SO|ko|14t1|uek|8yzs|ne:j64bwd|0
Mandeville|mandeville||JM|11r|10cr|3v56|-glzs|ne:j63wzz|1
Mandritsara|mandritsara||MG|118|7hl|-3e60|ago6|ne:j64bod|1
Mandurah|mandurah||AU|1ve|1klo|-6yyb|ot3z|ne:j64m5b|1
Mandya|mandya||IN|th|63xm|2ozs|ghio|ne:j64fjv|1
Manga|manga||BF|1xf|bph|2hzg|-87u|ne:j63zzj|1
Mangai|mangai||CD|6j|sp0|-v64|46p0|ne:j64f7h|1
Mangaluru|mangaluru|mangalore|IN|th|gn94|2rjc|g1jo|ne:j64lvj|1
Mango|mango||TG|1js|ww2|27xo|3ms|ne:j649dv|1
Mangochi|mangochi||MW|11v|23e7|-33kk|7k58|ne:j64btd|1
Mangyshlak|mangyshlak|aktau|KZ|11u|35rn|9d49|aym1|ne:j640rf|1
Manhattan|manhattan||US|t2|17xx|8ef8|-kpb8|ne:j641qt|1
Manica|manica||MZ|11w|334|-42dc|71pc|ne:j64bjp|1
Manicoré|manicore||BR|2q|gml|-18ui|-d4z3|ne:j64kvn|1
Manila|manila||PH|13s|6lwtc|34p9|pxhn|ne:j64n1h|1
Manily|manily||RU|sq|a|den0|zfgo|ne:j64jfx|1
Manisa|manisa||TR|120|588z|8a2o|5vq8|ne:j64af1|1
Manizales|manizales||CO|bc|8208|131k|-g6ps|ne:j64lqn|1
Manja|manja||MG|1qz|16o|-4ldl|9i2t|ne:j64bp3|1
Manjimup|manjimup||AU|1ve|39s|-7c59|ow7w|ne:j64k4p|1
Mankato|mankato||US|142|17gl|9gro|-k5aw|ne:j6414t|1
Mannheim|mannheim||DE|5s|1emj4|aly4|1tcs|ne:j64ekl|1
Manokwari|manokwari||ID|qe|1lhk|-6pz|sqhh|ne:j64kpj|1
Manono|manono||CD|tw|zkv|-1kbs|5vt0|ne:j64kp7|1
Manpo|manpo||KP|cn|405n|8tha|r2i6|ne:j6465p|1
Mansa|mansa||ZM|104|wmd|-2ef4|66x0|ne:j64jz7|1
Mansa Konko|mansa konko||GM|101|eeo|2v7x|-3cz6|ne:j63xxt|1
Mansehra|mansehra||PK|165|1fau|7cze|fosg|ne:j6456p|1
Mansfield|mansfield||US|1aj|1o08|8qhr|-hooz|ne:j642tl|1
Manta|manta||EC|11o|3xby|-7k8|-hax0|ne:j64kmp|1
Manukau|manukau|manukau city,southern auckland|NZ|56|81tc|-7xhs|11hf6|ne:j64n61|1
Manyoni|manyoni||TZ|1l8|8m|-18lg|7hag|ne:j64asj|1
Manzanillo|manzanillo||CU|m2|2qws|4cz2|-gj1a|ne:j64e7v|1
Manzanillo|manzanillo||MX|eh|2dfz|42zk|-mcyn|ne:j64jeb|1
Manzhouli|manzhouli|manchouli|CN|17d|208k|amps|p63g|ne:j64jnl|1
Manzini|manzini||SZ|124|2dah|-5ofq|6q6w|ne:j63v9z|1
Mao|mao||DO|1ta|119l|46v4|-f8f2|ne:j63x4x|1
Mao|mao||TD|sy|dwv|30y2|3a5p|ne:j64kn7|1
Maoming|maoming||CN|me|q3lf|4p50|nrh8|ne:j64dyp|1
Mapai|mapai||MZ|kl|5l|-4w97|6umn|ne:j64bm5|1
Maputo|maputo||MZ|125|uzqo|-5k99|6zg0|ne:j64me3|1
Maqat|maqat|makat|KZ|55|av6|a7nm|bfgx|ne:j64625|1
Mar de Ajó|mar de ajo||AR|e6|ai2|-7vay|-c5bi|ne:j64heb|1
Mar del Plata|mar del plata||AR|e6|bwxl|-857k|-ccag|ne:j64mpp|1
Marabá|maraba||BR|1ck|3k86|-15a4|-aizc|ne:j64mn7|1
Maracaibo|maracaibo||VE|1xi|18erk|2at3|-fcy3|ne:j64mth|1
Maracaju|maracaju||BR|137|hia|-4mqs|-btrs|ne:j6475f|1
Maracay|maracay||VE|3y|ll08|272w|-ehl6|ne:j64jx1|1
Maradah|maradah|marada|LY|y|1xg|69kh|449y|ne:j64de3|1
Maragheh|maragheh||IR|hv|38t5|80qk|9wmw|ne:j64g7x|1
Maralal|maralal||KE|1gi|g2x|8kh|7v0w|ne:j64b93|1
Marambio Base|marambio base|marambio station,vicecomodoro marambio base|AQ||46|-drmh|-c544|ne:j64iu5|1
Marathon|marathon||CA|1av|3kj|ag5s|-iier|ne:j64h3f|1
Marbella|marbella||ES|31|3zmb|7tri|-11oh|ne:j643e5|1
Mardan|mardan||PK|165|6ft4|7bw0|ffv4|ne:j6457b|1
Mardin|mardin||TR|12d|1j2l|7zwb|8qdf|ne:j64akf|1
María Elena|maria elena||CL|3d|1tu|-4sgc|-exks|ne:j646uv|1
Marib|marib|ma rib|YE|10o|cyi|3azm|9pss|ne:j640bd|1
Maribor|maribor||SI|12f|2g50|9z3x|3cr8|ne:j64axf|1
Maridi|maridi||SS|1v6|az4|11xb|6bg2|ne:j64a93|1
Mariehamn|mariehamn||AX|jn|88q|cvpm|49xe|ne:j63y4n|1
Mariental|mariental||NA|no|abo|-59ys|3ukv|ne:j64djz|1
Mariestad|mariestad||SE|1uo|bhn|ckyy|2yp4|ne:j63we3|1
Marietta|marietta||US|ks|1bcg|7a04|-i4c8|ne:j642ij|1
Mariinsk|mariinsk||RU|uc|x9u|c1q4|it5w|ne:j64ch7|1
Marília|marilia||BR|1o6|4jqy|-4rdg|-apf0|ne:j6481t|1
Marinette|marinette||US|1vm|kyp|9nzw|-is5t|ne:j6495x|1
Maringá|maringa||BR|1ch|71cf|-50mn|-b4p0|ne:j64gt1|1
Marion|marion||US|q5|tjt|8oy7|-icy8|ne:j642ph|1
Mariscal Estigarribia|mariscal estigarribia|mariscal jose f estigarribia|PY|92|1xg|-4pzg|-czo4|ne:j640eb|1
Mariupol|mariupol||UA|h9|abmi|a3ea|81sa|ne:j64jyf|1
Marka|marka|merca|SO|1ka|1ie|dpi|9m39|ne:j64kdp|1
Markala|markala||ML|1o7|15gq|2xhc|-1au4|ne:j64d67|1
Maroantsetra|maroantsetra||MG|1qr|tcu|-3b31|anqt|ne:j64kll|1
Maroua|maroua||CM|j5|6uv9|29r8|32j3|ne:j64mq1|1
Marovoay|marovoay||MG|118|o45|-3g83|9ztp|ne:j64bol|1
Marquette|marquette||US|13u|kin|9z5n|-iqfm|ne:j649c3|1
Marrakesh|marrakesh|marrakech|MA|12l|iou8|6s2n|-1pqr|ne:j64mdv|1
Marrupa|marrupa||MZ|171|6re|-2tu8|81cj|ne:j64bkx|1
Marsabit|marsabit||KE|i2|cp8|hz8|8520|ne:j64kjx|1
Marsala|marsala||IT|1kw|1o0o|83pi|2nz7|ne:j64dsd|1
Marseille|marseille|marseille aix en provence|FR|1ew|u08w|9a1j|15gj|ne:j64lw5|1
Martapura|martapura||ID|sj|48yn|-qc7|om31|ne:j64kmh|1
Marv Dasht|marv dasht|marvdasht|IR|jd|2og8|6dy6|bbkn|ne:j646zz|1
Mary|mary||TM|12n|3tw4|824g|d93x|ne:j64lcx|1
Maryborough|maryborough||AU|1fn|fye|-5h4z|wqeh|ne:j64k6t|1
Maryborough|maryborough||AU|1tx|5fq|-7xvk|ut10|ne:j64ihf|1
Marzuq|marzuq|murzuk|LY|15r|16hr|5jvo|2z8c|ne:j64ksd|1
Masaka|masaka||UG|12q|1efx|-2jk|6stw|ne:j64apn|1
Masasi|masasi||TZ|15j|rsw|-2asg|8bdr|ne:j64as1|1
Masaya|masaya||NI|12r|2se9|2kcq|-igba|ne:j640g1|1
Mascara|mascara||DZ|12s|2bie|7l5g|12w|ne:j64i05|1
Maseru|maseru||LS|12t|7qss|-6a7j|5w29|ne:j64mi7|1
Mashhad|mashhad||IR|1g8|1gx3c|7rvk|crmp|ne:j64myl|1
Masindi|masindi||UG|12w|oam|cx4|6spq|ne:j63u1l|1
Masindi-Port|masindi port||UG|12w|6f3|d4c|6vgb|ne:j64am5|1
Masjed Soleyman|masjed soleyman||IR|uz|3akf|6urc|akef|ne:j6470d|1
Mason City|mason city||US|qb|lga|98z8|-jz54|ne:j648ox|1
Massangena|massangena||MZ|kl|i2|-4m6l|72ak|ne:j64bm1|1
Massawa|massawa||ER|g7|3204|3cg5|8gec|ne:j64ek1|1
Masterton|masterton||NZ|11q|fl4|-8rxb|11nag|ne:j64n4j|1
Masvingo|masvingo||ZW|12z|1mvr|-4as4|6lt4|ne:j64a5v|1
Matadi|matadi||CD|70|59pi|-18vq|2vs4|ne:j64mk3|1
Matagalpa|matagalpa||NI|132|2c69|2ro3|-iexr|ne:j64b5f|1
Matagami|matagami||CA|1fv|1im|anvk|-gn0t|ne:j64h61|1
Matamoros|matamoros||MX|1oz|bjq9|5jow|-kwbc|ne:j64lm5|0
Matanzas|matanzas||CU|134|357x|4xsf|-hhgf|ne:j64ec3|1
Matara|matara||LK|135|1gno|19wi|h9h0|ne:j64ahj|1
Mataram|mataram||ID|1a0|apch|-1u77|ow3q|ne:j64dnf|1
Mataró|mataro||ES|c5|3xfh|8wiw|iwk|ne:j643ft|1
Matehuala|matehuala||MX|1in|1g91|52kc|-lkmc|ne:j64cx3|1
Mathura|mathura||IN|1sy|730v|5w6w|gnb0|ne:j6472p|1
Matočkin Šar|matockin sar|matochkin shar|RU|4a|a|fpcs|c3kh|ne:j64j6b|1
Matola|matola||MZ|125|bnoj|-5kds|6ygo|ne:j64bv1|1
Matruh|matruh|marsa matruh,mersa matruh|EG|138|27u6|6pwg|5u3w|ne:j64eg5|1
Matsue|matsue||JP|1km|3czv|7lny|siqy|ne:j64ext|1
Matsumoto|matsumoto||JP|168|4tjy|7rms|tkl0|ne:j64f4f|1
Matsuyama|matsuyama||JP|ia|bfol|795j|sgfe|ne:j64jnb|1
Maturín|maturin||VE|14j|8t3w|238c|-djf8|ne:j64j01|1
Maués|maues||BR|2q|p4h|-q5k|-cddc|ne:j64gm3|1
Maumere|maumere||ID|1a1|28gt|-1ui5|q6zv|ne:j64e21|1
Maun|maun||BW|19b|12jd|-4a8o|50pk|ne:j64i5l|1
Mavinga|mavinga||AO|fd|n5c|-3dtz|4d3k|ne:j64ht1|1
Mawlamyine|mawlamyine|moulmein|MM|14i|9eml|3jbg|kxmk|ne:j64iq5|1
Mawson Station|mawson station||AQ||1o|-ehpt|dh5a|ne:j64iv5|1
Maxixe|maxixe||MZ|q7|2kho|-545g|7l26|ne:j64btl|1
May Pen|may pen||JM|e9|2w9y|3umq|-gjxp|ne:j646cz|1
Mayagüez|mayaguez||PR||68sr|3wfz|-ee1x|ne:j64isp|1
Mayda Shahr|mayda shahr|maidan shar|AF|1uv|r0g|7dtg|eqv4|ne:j63zbd|1
Maydh|maydh||||n5c|2cq1|a3en|ne:j64itd|1
Maykop|maykop|majkop|RU|k|3e9f|9k7o|8lkg|ne:j64595|1
Mayumba|mayumba||GA|1a2|330|-qd2|2a6c|ne:j64kqd|1
Mazabuka|mazabuka||ZM|1mm|1ddy|-3edk|5y74|ne:j64jzn|1
Mazar-i-Sharif|mazar i sharif|mazar e sharif|AF|6a|9tif|7v6g|edqw|ne:j64m41|1
Mazatenango|mazatenango||GT|1n5|1dvw|3448|-jm3g|ne:j64fcx|1
Mazatlán|mazatlan|mazatan|MX|1lw|apsw|67wb|-nlsl|ne:j64cw3|1
Mazatlán|mazatlan|juarez|MX|1l5|7w3w|4z6b|-mt54|ne:j64mg3|1
Mazowe|mazowe||ZW|12u|7ou|-3r6k|6mys|ne:j64a4p|1
Mazyr|mazyr||BY|or|2eix|b5l8|69v6|ne:j64i3f|1
Mbabane|mbabane||SZ|oe|1xju|-5n27|6o85|ne:j64let|1
Mbaïki|mbaiki||CF|zd|1fss|tv4|3uw0|ne:j64dph|1
Mbala|mbala||ZM|19d|fve|-1w7k|6q1w|ne:j64jzd|1
Mbale|mbale||UG|a9|8mgw|8ew|7bno|ne:j64amb|1
Mbalmayo|mbalmayo||CM|cg|1pvy|r5w|2gqg|ne:j64hm1|1
Mbamba Bay|mbamba bay||TZ|1h5|6xx|-2f25|7g9e|ne:j64asf|1
Mbandaka|mbandaka||CD|1xr|5w6s|b4|3ww8|ne:j64lqx|1
Mbanza-Congo|mbanza congo|m banza kongo|AO|1wr|1afq|-1cdk|31vk|ne:j64hs7|1
Mbanza-Ngungu|mbanza ngungu|nkamba|CD|70|48fd|-14i8|36ns|ne:j64f8v|1
Mbarara|mbarara||UG|to|1sl0|-4mk|6khw|ne:j64aqj|1
Mbe|mbe||CM|18m|31q|1oko|2wxs|ne:j64hnf|1
Mbeya|mbeya||TZ|13d|691d|-1wlg|75y4|ne:j64mgv|1
Mbombela|mbombela||ZA|15i|7gmi|-5giw|6n1k|ne:j64bmj|1
Mbuji-Mayi|mbuji mayi||CD|tm|rr88|-1bft|5231|ne:j64lul|1
Mbulu|mbulu||TZ|4g|ad2|-tpc|7m5g|ne:j64at5|1
McAlester|mcalester||US|1ao|gpw|7hjm|-kixo|ne:j641ux|1
McAllen|mcallen||US|1q4|7sv8|5m6m|-l1y1|ne:j641zf|1
McCook|mccook||US|17a|66k|8m88|-lkfq|ne:j648q5|1
McGrath|mcgrath||US|26|3u|dhs0|-xcl2|ne:j649jt|1
Mchinji|mchinji||MW|13f|e4h|-2yhc|71uw|ne:j63xep|1
McMinns Lagoon|mcminns lagoon||AU|19i|3vl|-2opd|s36s|ne:j64i6x|1
McMurdo Station|mcmurdo station||AQ||rs|-gnsb|zrkm|ne:j64iuv|1
Meadow Lake|meadow lake||CA|1jo|4je|blo5|-n8or|ne:j64gz5|1
Meander River|meander river||CA|29|5k|cni5|-p81q|ne:j647il|1
Medan|medan||ID|1nn|19by0|rmz|l569|ne:j64mvf|1
Medani|medani|wad madani|SD|kt|74q2|3340|76n4|ne:j64kan|1
Médéa|medea||DZ|15z|35yz|7rv4|ldg|ne:j64i11|1
Medellín|medellin||CO|3c|1ynzc|1cfl|-g75m|ne:j64mwf|1
Medenine|medenine||TN|10n|1bm1|75ps|28dj|ne:j63t4d|1
Medford|medford||US|1b3|2bql|92le|-qc3s|ne:j64ixx|1
Medicine Hat|medicine hat||CA|29|1cpu|aq25|-nq1d|ne:j64kz1|1
Medina|medina|al madinah|SA|1p|lnbk|5923|8hdx|ne:j64lfn|1
Medinipur|medinipur||IN|1v3|3mhz|4saw|iogc|ne:j64gct|1
Mednogorsk|mednogorsk||RU|1b5|no4|b0r3|cca3|ne:j64cc7|1
Meekatharra|meekatharra||AU|1ve|i6|-5p8w|pe81|ne:j64k4l|1
Meerut|meerut||IN|1sy|typc|67s8|gnit|ne:j64l8d|1
Megion|megion||RU|uq|11kj|d35c|gb5l|ne:j64cet|1
Mehtar Lam|mehtar lam|mihtarlam|AF|xt|ddt|7fd0|f1er|ne:j63z9z|1
Meiganga|meiganga||CM|d|1pt0|1eb9|329g|ne:j64hmt|1
Meizhou|meizhou||CN|me|8w5u|57i5|ovzk|ne:j64dxz|1
Mejillones|mejillones||CL|3d|1kp|-4y8o|-f3lg|ne:j64kqx|1
Mékambo|mekambo||GA|1ac|2g2|7uj|2zid|ne:j64fft|1
Mekele|mekele|mek ele|ET|1qi|21yo|2w60|8gjw|ne:j64lxp|1
Meknes|meknes||MA|13l|eyak|79ks|-16wg|ne:j64brp|1
Mekoryuk|mekoryuk||US|26|2r|cxym|-zmbv|ne:j643l7|1
Melbourne|melbourne||AU|1tx|2hdlc|-83t1|v2mb|ne:j64n2l|1
Melbourne|melbourne||US|jp|5osm|60ox|-h9z7|ne:j642ch|1
Melekeok|melekeok||PW||5f6|1lru|sus9|ne:j64l5d|1
Melilla|melilla||ES|13n|3118|7kdk|-mrg|ne:j64k9z|1
Melitopol|melitopol||UA|1x2|3dww|a1ei|7kz3|ne:j649pp|1
Melo|melo||UY|ci|16ti|-6xor|-bm20|ne:j648av|1
Melton|melton||AU|1tx|oz4|-82tb|uzic|ne:j64iib|1
Melun|melun||FR|1xt|5cgo|aehh|kkq|ne:j646u1|1
Melut|melut||SS|1sk|4xz|28i9|6wgg|ne:j64a9d|1
Melville|melville||CA|1jo|3av|ax05|-m17k|ne:j647hd|1
Memphis|memphis||US|1q0|n63s|7j03|-jagj|ne:j64m9l|1
Ménaka|menaka||ML|ki|712|3etb|iio|ne:j64kqp|1
Mendefera|mendefera||ER|10y|5ilq|36v0|8bib|ne:j64ek5|1
Mendi|mendi||PG|1mo|k98|-1bes|usdg|ne:j64bpp|1
Mendocino|mendocino||US|bd|f8|8fau|-qj8q|ne:j641dn|1
Mendoza|mendoza||AR|13o|j51k|-71pq|-er0a|ne:j64mph|1
Mengzi|mengzi|mengzi city|CN|1wj|6i25|509f|m5vx|ne:j646kb|1
Meningie|meningie||AU|1m5|15p|-7ngj|tv3p|ne:j64iet|1
Menkere|menkere||RU|1hy|a|eklq|qfs1|ne:j64jcd|1
Menongue|menongue||AO|fd|a1y|-3562|3sko|ne:j64mqh|1
Merauke|merauke||ID|1cc|qjw|-1tj8|u3ci|ne:j64kjf|1
Merced|merced||US|bd|2257|7ztu|-ptn7|ne:j648gx|1
Mercedes|mercedes||AR|e6|14ut|-7ffs|-cqn4|ne:j647sv|1
Mercedes|mercedes|villa mercedes|AR|1im|122p|-77y8|-e164|ne:j64hfx|1
Mercedes|mercedes||UY|1ly|won|-74mr|-cfrg|ne:j648ap|1
Mercedes|mercedes||AR|f4|nnd|-695g|-cg5c|ne:j64hi7|1
Mereeg|mereeg|mareeg|SO|ka|f8|t2a|a4yw|ne:j64kfv|1
Mérida|merida||MX|1wg|kolk|4hsm|-j7i2|ne:j64mgh|1
Mérida|merida||VE|160|7ekx|1stc|-f8uc|ne:j64lav|1
Mérida|merida||ES|j4|14g7|8c8w|-1cwk|ne:j63vdx|1
Meridian|meridian||US|149|wmq|6xq2|-j0fw|ne:j642k3|1
Merimbula|merimbula||AU|17q|4wv|-7wpw|w4mw|ne:j64i9x|1
Merowe|merowe||SD|19d|7wa|3ym9|6thz|ne:j64kaz|1
Merredin|merredin||AU|1ve|224|-6qx8|pcjv|ne:j64i8b|1
Meru|meru||KE|i2|10fu|go|82fk|ne:j64lof|1
Mesa|mesa||US|48|n9hu|75wf|-ny5t|ne:j641bz|1
Messina|messina||IT|1kw|5egq|86r9|3bzg|ne:j64ds7|1
Metairie|metairie||US|zy|8g66|6fcv|-jbmg|ne:j641x5|1
Metz|metz||FR|zp|8rqa|aj0j|1boo|ne:j64fqp|1
Mexicali|mexicali||MX|62|iyvc|6zxz|-or2c|ne:j64lln|1
Mexico City|mexico city|ciudad de m|MX|gx|bbu3k|4618|-l8wx|ne:j64n37|1
Meymaneh|meymaneh|maymana|AF|je|4a5v|7p8m|dvrp|ne:j64hp7|1
Mezen|mezen||RU|4a|2u0|e44a|9hcw|ne:j64ke5|1
Miahuatlán|miahuatlan|miahuatlan de porfirio diaz|MX|1a6|dls|3i04|-kpdc|ne:j645vz|1
Miami|miami||US|jp|3bpew|5izs|-h711|ne:j64n0f|1
Miami Beach|miami beach||US|jp|8qme|5j5f|-h6au|ne:j642e5|1
Miandrivazo|miandrivazo||MG|1qz|fx3|-46l6|9qtm|ne:j64bp7|1
Mianyang|mianyang|mianyang sichuan|CN|1kv|tx5s|6qu7|mge8|ne:j64lsb|1
Miaoli|miaoli|miaoli city|TW|13t|37qo|59l0|pw94|ne:j64iwx|1
Miass|miass||RU|d2|3l8s|bsci|cvp1|ne:j64c7x|1
Michurinsk|michurinsk||RU|1p1|2057|bc6g|8oi0|ne:j645gx|1
Middelburg|middelburg||ZA|15i|3bde|-5irg|6be4|ne:j64bmt|1
Middelburg|middelburg||NL|1x4|zv9|b1e4|rus|ne:j63vmv|1
Middelburg|middelburg||ZA|i3|e0k|-6r20|5cz8|ne:j64lhp|1
Middlesbrough|middlesbrough||GB|1n1|8x0q|bp58|-9ho|ne:j64ac3|1
Midland|midland||US|1q4|2405|6v5f|-lvsf|ne:j648vd|1
Miercurea Cuic|miercurea cuic|miercurea ciuc|RO|np|wfh|9xq2|5gy0|ne:j63urt|1
Mikhalkino|mikhalkino||RU|w2|fu|evok|ylzv|ne:j645ad|1
Mikhaylova|mikhaylova||RU|1pq|a|g3fq|in5s|ne:j64ja5|1
Mikhaylovka|mikhaylovka||RU|1ua|19g2|aqbr|99gv|ne:j64c3t|1
Mikkeli|mikkeli||FI|1mq|zx2|d804|5uj6|ne:j63y5z|1
Mikumi|mikumi||TZ|152|cy4|-1l3g|7xc8|ne:j64aqt|1
Milagro|milagro||EC|mj|2cuq|-gtg|-h274|ne:j64e3j|1
Milan|milan||IT|zj|1r4dk|9qv3|1z0f|ne:j64mvn|1
Mildura|mildura||AU|1tx|10xn|-7bru|ugui|ne:j64k5x|1
Miles City|miles city||US|14o|6nb|9y3d|-moo0|ne:j648c7|1
Millerovo|millerovo||RU|1h1|tq7|ahlv|8npi|ne:j64c2v|1
Milwaukee|milwaukee||US|1vm|tqzk|987m|-iuer|ne:j64m9p|1
Minas|minas||UY|ye|vrw|-7d78|-bu5o|ne:j64121|1
Minatitlán|minatitlan||MX|1tm|4bse|3uql|-k9ec|ne:j64d21|1
Mindelo|mindelo||CV||1ihf|3m9y|-5cwg|ne:j64itz|1
Mineiros|mineiros||BR|le|u1z|-3rkf|-b9k0|ne:j64hdh|1
Mingan|mingan||CA|1fv|gc|as4q|-dpyl|ne:j64l0x|1
Minna|minna||NG|185|698h|2288|1ejg|ne:j64khj|1
Minneapolis|minneapolis|minneapolis st paul|US|142|1k2io|9n2z|-jzjt|ne:j64msz|1
Minot|minot||US|190|ufj|ac5x|-lplq|ne:j64l91|1
Minsk|minsk||BY|143|12oqw|bjwr|5wov|ne:j64mr1|1
Minxian|minxian|min county|CN|kg|1gc2|7dpm|mape|ne:j64dux|1
Miracema|miracema||BR|1gm|kl8|-4l78|-91m8|ne:j647gb|1
Mirbat|mirbat||OM|gl|v4|3n44|bq06|ne:j64cih|1
Miri|miri||MY|1jm|4w38|xy7|ofid|ne:j64bhz|1
Mirny|mirny|mirnyy|RU|1hy|v3o|dek8|ofby|ne:j64llb|1
Mirny Station|mirny station||AQ||4p|-e9p7|jxn3|ne:j64iv3|1
Mirpur Khas|mirpur khas|mirput khas|PK|1l6|7n0z|5h06|eshy|ne:j64j51|1
Mirzapur|mirzapur||IN|1sy|59o9|5e0u|hp44|ne:j64gbd|1
Mishan|mishan||CN|o5|1vbt|9rgw|s9lc|ne:j64f2p|1
Miskolc|miskolc||HU|97|5b65|ab58|4gc8|ne:j64anb|1
Misrata|misrata|misratah|LY|148|89xk|6xug|38ig|ne:j64lxd|1
Missoula|missoula||US|14o|1k7s|a1o2|-ofkr|ne:j64l8z|1
Mistassini|mistassini|mistissini|CA|1fv|21h|at0r|-ftyi|ne:j64h5n|1
Mitchell|mitchell||US|1m9|bqd|9dav|-l0di|ne:j648s1|1
Mitilini|mitilini|mytilene|GR|1uf|mmo|8ds0|5owa|ne:j64fup|1
Mitla|mitla||MX|1a6|5tn|3mj6|-knts|ne:j64d01|1
Mito|mito||JP|pm|7l2c|7smw|u3y8|ne:j64f5n|1
Mitú|mitu||CO|1th|4kd|98v|-f1go|ne:j64miz|1
Mityana|mityana||UG|am|vqj|338|6vas|ne:j64alt|1
Mitzik|mitzik|mitzic|GA|1vo|367|61p|2h8y|ne:j64fg1|1
Miyazaki|miyazaki||JP|14c|6yao|6ua6|s614|ne:j64lt5|1
Mizdah|mizdah|mizda|LY|14d|k57|6qjl|2s6h|ne:j64ddd|1
Mkokotoni|mkokotoni||TZ|tr|1zg|-19d2|8exk|ne:j63wbp|1
Mmabatho|mmabatho|mmabatho mafikeng|ZA|198|28ks|-5jb0|5hlw|ne:j64kcj|1
Mo i Rana|mo i rana||NO|18t|fqx|e7pa|31b7|ne:j64j31|1
Moab|moab||US|1sv|4f6|89mx|-nhac|ne:j648mp|1
Moanda|moanda||CD|70|3arf|-19p9|2nby|ne:j64f8h|1
Moanda|moanda||GA|nx|n9j|-c2v|2tuo|ne:j64fmh|1
Moatize|moatize||MZ|1q2|weo|-3g83|79yk|ne:j64bjh|1
Moba|moba||CD|tw|7py|-1ih0|6dbk|ne:j64fat|1
Mobaye|mobaye||CF|76|ezr|xc0|4jfc|ne:j640sd|1
Mobile|mobile||US|23|5fkq|6kq8|-ivec|ne:j64izb|1
Mobridge|mobridge||US|1m9|2fo|9re1|-liyj|ne:j648sb|1
Moca|moca||DO|ix|1bpm|45o2|-f45q|ne:j63xof|1
Mocambique|mocambique|island of mozambique|MZ|16p|15wr|-381r|8pwm|ne:j64kcd|1
Moçâmedes|mocamedes|namibe|AO|16n|2ujo|-397g|2lts|ne:j64m4f|1
Mochudi|mochudi||BW|um|ums|-583e|5lsg|ne:j640tl|1
Mocimboa|mocimboa|mocimboa da praia|MZ|b5|lj9|-2fcc|8ncc|ne:j64bkt|1
Mocoa|mocoa||CO|1f6|h03|8vg|-gfa4|ne:j646dl|1
Mocuba|mocuba||MZ|1wu|1h88|-3m0g|877s|ne:j64bt3|1
Modena|modena||IT|il|3rf2|9kis|2c9c|ne:j6467b|1
Modesto|modesto||US|bd|6xiy|82ju|-pxkc|ne:j648hj|1
Moengo|moengo||SR|12k|5zq|17fw|-bntw|ne:j6439p|1
Mogadishu|mogadishu|muqdisho|SO|6i|nkrk|fym|9q1b|ne:j64mez|1
Mogocha|mogocha||RU|dn|9rb|bilx|po4i|ne:j64jb1|1
Mohales Hoek|mohales hoek|mohale s hoek|LS|14f|ja8|-6gpi|5w1c|ne:j63wsl|1
Mohembo|mohembo|mohembo west|BW|19b|l1|-3x78|4o7k|ne:j64i5h|1
Mojokerto|mojokerto||ID|r6|2eul|-1lmw|o3ik|ne:j64e1f|1
Mokhotlong|mokhotlong||LS|14g|6sp|-6a0e|68d8|ne:j63wuv|1
Mokpo|mokpo||KR|mu|5r3m|7gkk|r39y|ne:j64cjz|1
Molde|molde||NO|163|eci|dg63|1jfd|ne:j64kbh|1
Molepolole|molepolole||BW|ww|1csw|-589s|5gu4|ne:j64l4x|1
Mollendo|mollendo||PE|44|11u1|-3nbs|-ffpk|ne:j644t7|1
Moloundou|moloundou||CG|1iy|9g4|fox|39ev|ne:j64ftp|0
Mombasa|mombasa||KE|ec|iwk0|-v5p|8i8g|ne:j64mi5|1
Monaco|monaco||MC||s2b|9dhw|1l5h|ne:j64l5h|1
Monastir|monastir||TN|14l|1j7e|7np7|2b2x|ne:j63t8d|1
Monchegorsk|monchegorsk||RU|15q|12h8|ek57|71b3|ne:j64bxd|1
Monclova|monclova||MX|eb|52ac|5rk8|-lqk8|ne:j64kh5|1
Moncton|moncton||CA|17l|1xxn|9vkx|-dvqr|ne:j64l1b|1
Mongbwalu|mongbwalu||CD|1b8|26b|f1s|6fql|ne:j64ej5|1
Mongo|mongo||TD|mt|lf7|2m0d|40ag|ne:j64een|1
Mongomo|mongomo||GQ|1uz|528|clt|2fbi|ne:j64eeb|0
Mongu|mongu||ZM|1vd|14ja|-39wc|4ye8|ne:j64a3z|1
Monroe|monroe||US|zy|26ho|6yug|-jqso|ne:j648sj|1
Monrovia|monrovia||LR|14s|mb8o|1cq2|-2bbx|ne:j64mvj|1
Mons|mons||BE|nc|1yfh|at8s|ue6|ne:j63yyp|1
Mont-Laurier|mont laurier||CA|1fv|8ze|9z6o|-g6k8|ne:j64h65|1
Montana|montana||BG|14o|10lx|9azg|4zaq|ne:j63zjx|1
Montana|montana||US|26|a|db0d|-w5yw|ne:j643rt|1
Monte Cristi|monte cristi||DO|14p|d49|49am|-fcus|ne:j64fd1|1
Monte Plata|monte plata||DO|14q|bzg|4146|-eygg|ne:j63xt5|1
Monte Quemado|monte quemado||AR|1jg|8sb|-5j2k|-dh2y|ne:j64hhn|1
Montego Bay|montego bay||JM|1hs|2p88|3yhn|-gp7j|ne:j64jht|1
Montemorelos|montemorelos||MX|19x|wwg|5ed8|-ledc|ne:j645tj|1
Montepuez|montepuez||MZ|b5|1jrr|-2t8c|8cxc|ne:j64bkn|1
Monterey|monterey||US|bd|2nwg|7uer|-q4jc|ne:j64ju1|1
Montería|monteria||CO|fp|5wce|1vkn|-g9kk|ne:j64jhf|1
Montero|montero||BO|1j8|1wdk|-3pvc|-dk48|ne:j64hw5|1
Monterrey|monterrey||MX|19x|27k74|5i33|-li5z|ne:j64n1j|1
Montes Claros|montes claros||BR|141|74gr|-3l0g|-9efc|ne:j64m0j|1
Montevideo|montevideo||UY|14r|wffs|-7gy9|-c1fm|ne:j64m85|1
Montgomery|montgomery||US|23|4911|6xpc|-ihqg|ne:j64laz|1
Monticello|monticello||US|1sv|1fs|847y|-nfou|ne:j648mj|1
Montpelier|montpelier||US|1to|6l6|9hig|-fjzy|ne:j642av|1
Montpelier|montpelier||US|pq|2b9|92ka|-nurt|ne:j648dd|1
Montpellier|montpellier||FR|y7|70ie|9ci0|tv0|ne:j64fob|1
Montréal|montreal||CA|1fv|26tyo|9r3f|-frsc|ne:j64mzl|1
Montrose|montrose||US|ek|gt9|88w5|-n4an|ne:j648jn|1
Monywa|monywa||MM|1hl|4ujy|4qka|ke6k|ne:j64k7t|1
Moorhead|moorhead||US|142|rew|a1on|-kqgu|ne:j648bz|1
Moose Jaw|moose jaw||CA|1jo|oti|asw0|-mmfg|ne:j64kyx|1
Moosonee|moosonee||CA|1av|1bx|azom|-had0|ne:j64l0n|1
Mopipi|mopipi||BW|cd|2jp|-4jf7|5bz4|ne:j64i5z|1
Mopti|mopti||ML|14t|2boo|33t0|-w94|ne:j64krx|1
Moquegua|moquegua||PE|14u|162d|-3on0|-f7dk|ne:j64k95|1
Moradabad|moradabad|muradabad|IN|1sy|gv94|66k5|gvoc|ne:j64l83|1
Moranbah|moranbah||AU|1fn|7ps|-4prk|vq9o|ne:j64imn|1
Moratuwa|moratuwa||LK|ei|4abk|1gbg|h4cw|ne:j64aht|1
Morawa|morawa||AU|1ve|77|-69fn|ov28|ne:j64i81|1
Moree|moree||AU|17q|6bv|-6be3|w43h|ne:j64k5f|1
Morelia|morelia||MX|13v|dt5e|489i|-los7|ne:j64cyb|1
Morgantown|morgantown||US|1vb|19dk|8hsa|-h4y1|ne:j64965|1
Morioka|morioka||JP|qs|6br8|8ihc|u8ys|ne:j64jot|1
Morogoro|morogoro||TZ|152|5dli|-1gmg|82l4|ne:j64lnl|1
Morombe|morombe||MG|1qz|cwn|-4nqn|9am1|ne:j64klp|1
Morón|moron||CU|e3|1ez0|4qln|-guoz|ne:j64e7l|1
Mörön|moron||MN|pj|ld6|an2d|lgso|ne:j64jff|1
Morondava|morondava||MG|1qz|seb|-4ci9|9hox|ne:j64klv|1
Moroni|moroni||KM||2ray|-2ib6|99n6|ne:j64l5n|1
Moroto|moroto|moroto town|UG|154|ab|jln|7fa8|ne:j64amn|1
Morrinhos|morrinhos||BR|le|qcf|-3st0|-aixo|ne:j647rd|1
Morshansk|morshansk||RU|1p1|122u|bggj|8ykc|ne:j64c65|1
Moscow|moscow||RU|156|680tc|by79|8288|ne:j64n35|1
Moshi|moshi||TZ|v7|fgca|-pro|8048|ne:j64atj|1
Moss|moss||NO|1xn|sh1|cqma|2abo|ne:j64bbl|1
Mossel Bay|mossel bay||ZA|1vf|cx3|-7bno|4qr8|ne:j64kc3|1
Mossendjo|mossendjo||CG|17y|nvc|-mok|2q5c|ne:j64gh1|1
Mossoró|mossoro||BR|1gk|4cbb|-141o|-8048|ne:j64kyh|1
Mostaganem|mostaganem||DZ|157|41c2|7pbg|p0|ne:j64i0b|1
Mostar|mostar||BA|ob|3htn|9aht|3ti0|ne:j64i1f|1
Mosul|mosul|al mawsil|IQ|189|s7fk|7sgd|98w7|ne:j64lxj|1
Motul|motul||MX|1wg|ged|4it4|-j4w0|ne:j645zv|1
Motupe|motupe||PE|y1|ak1|-1bgc|-h31o|ne:j644t1|1
Mouila|mouila||GA|17v|lls|-eee|2d07|ne:j64fm7|1
Moundou|moundou||TD|zh|3cwx|1tz0|3g5g|ne:j64lqz|1
Mount Barker|mount barker||AU|1ve|1dh|-7f88|p7x6|ne:j64i8f|1
Mount Gambier|mount gambier||AU|1m5|hwp|-83wp|u65e|ne:j64k5p|1
Mount Isa|mount isa||AU|1fn|pm8|-4fwn|twb8|ne:j64m6f|1
Mount Magnet|mount magnet||AU|1ve|bs|-60k6|p92v|ne:j64i7x|1
Mountain Village|mountain village||US|26|kz|db1z|-z3ca|ne:j643od|1
Moyale|moyale||KE|i2|j5x|r5s|8db8|ne:j64kjz|0
Moyeni|moyeni|quthing|LS|1fu|ima|-6ini|5xuw|ne:j63wtf|1
Moyo|moyo|moyo town|UG|15f|hb6|s60|6sr4|ne:j64alf|0
Moyobamba|moyobamba|mayobamba|PE|1iq|10ty|-1aog|-ghvn|ne:j64b0v|1
Mozdok|mozdok||RU|196|z9i|9dlz|9kk0|ne:j6459b|1
Mozhga|mozhga||RU|1sa|10h2|c3lw|b6nn|ne:j64cb5|1
Mpanda|mpanda||TZ|1h2|1kl6|-1d2k|6nl0|ne:j64ao5|1
Mpigi|mpigi||UG|15h|8ju|1qi|6xc0|ne:j63tyj|1
Mpika|mpika||ZM|19d|ly5|-2ja4|6qqw|ne:j64jzb|1
Mpwapwa|mpwapwa||TZ|h6|fa6|-1czs|7thc|ne:j64arn|1
Mt.  Hagen|mt hagen|mount hagen|PG|1vh|19ko|-198o|uws8|ne:j64lh5|1
Mt. Shasta|mt shasta|mount shasta|US|bd|2z3|8ur4|-q7qu|ne:j648il|1
Mtsensk|mtsensk||RU|1b4|10qh|bezr|7u00|ne:j64c2d|1
Mtwara|mtwara||TZ|15j|22je|-278o|8m3w|ne:j64as5|1
Muar|muar||MY|ro|43n6|fox|lzeq|ne:j64bgt|1
Mubende|mubende||UG|15k|em0|4k0|6q1w|ne:j64aln|1
Mubi|mubi||NG|e|4u5l|278v|2ue4|ne:j64dbt|1
Muconda|muconda||AO|10c|1sk|-29sc|4ki8|ne:j64hrn|1
Mucusso|mucusso||AO|fd|2s|-3v1f|4lcs|ne:j64dl7|0
Mudangiang|mudangiang|mudanjiang|CN|o5|qnvk|9jyi|rrwp|ne:j64jo3|1
Mudgee|mudgee||AU|17q|45r|-6zgo|w261|ne:j64icl|1
Mudon|mudon||MM|14i|39ik|3hh6|ky0v|ne:j64ipx|1
Mufulira|mufulira||ZM|ew|3ajc|-2ou4|6220|ne:j64ld7|1
Muğla|mugla||TR|15m|116f|7z5w|62uv|ne:j644g5|1
Muglad|muglad|mujlad|SD|1mf|ffh|2d4x|5xzp|ne:j64av7|1
Muineachan|muineachan|monaghan|IE|14k|4kx|bmlg|-1hr7|ne:j63yav|0
Muisne|muisne||EC|iw|ac1|4pg|-h5fs|ne:j646c7|1
Mukhomornoye|mukhomornoye||RU|dy|2s|e8h7|115g5|ne:j64bwh|1
Mulanje|mulanje||MW|15n|cpv|-3fpp|7lx4|ne:j63xh1|0
Mulhouse|mulhouse||FR|2f|4m8u|a8g0|1kpo|ne:j64fqh|1
Multan|multan||PK|1f3|wmds|6h1f|fbc3|ne:j64md3|1
Mumbai|mumbai||IN|11a|bario|42r1|fm5i|ne:j64n3v|1
Mumbwa|mumbwa||ZM|cd|eq6|-37l0|5svg|ne:j64a2p|1
Munchon|munchon||KP|sz|1ksz|8fv9|r9vp|ne:j64655|1
Muncie|muncie||US|q5|1txl|8m4y|-iaug|ne:j6492l|1
Mundybash|mundybash||RU|uc|4j2|ber1|ipqn|ne:j645lf|1
Munich|munich||DE|7k|rbso|abdz|2haq|ne:j64mwt|1
Münster|munster||DE|18u|5sh4|b508|1mso|ne:j64ekf|1
Muramvya|muramvya||BI|15o|dx5|-p5u|6chk|ne:j6404j|1
Murcia|murcia||ES|1gc|8pw7|8520|-8pw|ne:j64j1v|1
Murfreesboro|murfreesboro||US|1q0|2hby|7ol8|-iilb|ne:j6493z|1
Muriaé|muriae||BR|141|1ycl|-4j1g|-9330|ne:j6477d|1
Murmansk|murmansk||RU|15q|6ucf|es6c|73eg|ne:j64meb|1
Murom|murom||RU|1u8|2tav|bws8|90ds|ne:j64c6f|1
Muroran|muroran||JP|oo|3c4c|92rw|u7t4|ne:j64jo7|1
Murray Bridge|murray bridge||AU|1m5|e1e|-7j28|tujc|ne:j64igf|1
Muş|mus||TR|15s|1roo|8azm|8w6x|ne:j64agx|1
Musan|musan|musan county|KP|nk|1pua|91uo|rp5c|ne:j64dij|1
Muscat|muscat||OM|15t|fqw9|5279|ck3x|ne:j64mf1|1
Mushie|mushie||CD|6j|pie|-nas|3mk0|ne:j64f7p|1
Musina|musina||ZA|z5|fkv|-4sdk|6fpo|ne:j64kcv|1
Muskegon|muskegon||US|13u|262h|99lm|-ihhw|ne:j649b3|1
Muskogee|muskogee||US|1ao|ubj|7nu2|-kfvi|ne:j648r5|1
Musoma|musoma||TZ|126|2uqs|-bhs|78sw|ne:j64atn|1
Muswellbrook|muswellbrook||AU|17q|8z2|-6wzs|wc9w|ne:j64ict|1
Mutare|mutare||ZW|11x|5cet|-42dg|6zxg|ne:j64jzv|0
Muyinga|muyinga||BI|15u|1iuc|-m0b|6hxh|ne:j64i6d|1
Muynoq|muynoq|mo ynoq|UZ|t9|a14|9dpv|cneu|ne:j64j0t|1
Muzaffarnagar|muzaffarnagar||IN|1sy|7hu2|6bia|gnhy|ne:j64731|1
Muzaffarpur|muzaffarpur||IN|88|753k|5ljo|iasn|ne:j64gd7|1
Mwanza|mwanza||TZ|15v|al4o|-jg0|7238|ne:j64lnj|1
Mwanza|mwanza||MW|15v|8s3|-3chz|7ebz|ne:j63xgn|1
Mweka|mweka||CD|tl|133n|-11cc|4mfo|ne:j64f7z|1
Mwene-Ditu|mwene ditu||CD|tm|41yx|-1i0g|50v4|ne:j64kp3|1
Mwenga|mwenga||CD|1nb|1pk|-nfy|63dx|ne:j64f95|1
Mwingi|mwingi||KE|i2|8nn|-768|85r0|ne:j64b8l|1
Mwinilunga|mwinilunga||ZM|19c|ana|-2il0|58kw|ne:j64a3h|1
Mỹ Tho|my tho||VN|5l|2nsf|27v4|mslo|ne:j64a1h|1
Myeik|myeik||MM|1p6|5psw|2o3h|l4w3|ne:j64l4z|1
Myingyan|myingyan||MM|11s|3iec|4llm|kg1m|ne:j64ipf|1
Myitkyina|myitkyina||MM|s7|2zbw|5foc|kvhk|ne:j64k7p|1
Mykolayiv|mykolayiv|mykolaiv|UA|15w|ay60|a2el|6usj|ne:j643vv|1
Mymensingh|mymensingh||BD|gh|72q6|5az4|jddk|ne:j64hr3|1
Myrtle Beach|myrtle beach||US|1m7|1231|77y1|-gwp2|ne:j64jvp|1
Mys Shmidta|mys shmidta||RU|dy|do|erw9|-12h14|ne:j64bwv|1
Mysuru|mysuru|mysore|IN|th|j0ew|2mzz|gfhx|ne:j64lvl|1
Mzimba|mzimba||MW|15x|ewc|-2jtk|779c|ne:j63xd5|1
Mzuzu|mzuzu||MW|15x|2d15|-2gfc|7ai0|ne:j64luv|1
N'Délé|n dele|ndele|CF|6f|92s|1svv|4fcy|ne:j64mp1|1
N'Djamena|n djamena|n djamnna,ndjamena|TD|n8|l748|2lha|383s|ne:j64mj3|1
Nabatiye et Tahta|nabatiye et tahta|nabatieh|LB|2v|1pq8|75l5|7lj8|ne:j63y45|1
Naberezhnyye Chelny|naberezhnyye chelny|naberezhnye chelny|RU|1pn|9vry|bxs8|b7pb|ne:j645kd|1
Nabeul|nabeul||TN|166|2gul|7tbv|2ask|ne:j649ev|1
Nabire|nabire||ID|1cc|xve|-puz|t1mm|ne:j64kjd|1
Nablus|nablus||PS||4mnh|6wmf|7k0w|ne:j64itt|1
Nacala|nacala||MZ|16p|4tgb|-340y|8q5q|ne:j64mdd|1
Nacaome|nacaome||HN|1t5|109k|2wec|-ir2s|ne:j6448f|1
Nacogdoches|nacogdoches||US|1q4|noj|6rut|-kad5|ne:j648sv|1
Nacozari de García|nacozari de garcia|nacozari viejo|MX|1lw|95s|6iq0|-ni2c|ne:j645t5|1
Ñacunday|nacunday||PY|2k|yq|-5krs|-bqlv|ne:j644yp|1
Nadym|nadym||RU|1vz|zr7|e1mq|fjj0|ne:j64j75|1
Naga|naga||PH|bg|fw8z|2x34|qeh2|ne:j64kgl|1
Nagano|nagano||JP|168|cqkn|7usk|tm4k|ne:j64lu1|1
Nagaoka|nagaoka||JP|186|46pi|80yw|trg8|ne:j64f61|1
Nagasaki|nagasaki||JP|169|9bzz|70te|ru76|ne:j64mjx|1
Nagchu|nagchu|nagchu town|CN|1vt|1xg|6qwg|jq9g|ne:j64jij|1
Nagercoil|nagercoil||IN|1p2|4t3d|1r4c|glgc|ne:j64gez|1
Nagoya|nagoya||JP|u|1x8a8|7j9t|tcfe|ne:j64ltz|1
Nagpur|nagpur||IN|11a|1glio|4jd3|gy8w|ne:j64myd|1
Nagua|nagua||DO|12p|q4m|45i8|-eyxy|ne:j63xtl|1
Naha|naha||JP|1an|jehi|5m7s|rd4q|ne:j64lt7|1
Nain|nain||CA|17t|vz|c4bm|-d7z0|ne:j64mox|1
Nairobi|nairobi||KE|16b|1sij4|-9vy|7w2b|ne:j64n3h|1
Naivasha|naivasha||KE|1gi|xxr|-5h4|7t3g|ne:j64b9v|1
Najaf|najaf|an najaf|IQ|2x|e9jk|6uwz|9i3e|ne:j64lxl|1
Najran|najran||SA|16c|7x6x|3r2x|9gis|ne:j6453b|1
Nakasongola|nakasongola||UG|16d|5c9|a3l|6yfo|ne:j63u0h|1
Nakhodka|nakhodka||RU|1vz|3f3z|eirk|gm5c|ne:j64c8t|1
Nakhodka|nakhodka||RU|1eq|3f3z|96ja|shd6|ne:j64jbb|1
Nakhon Nayok|nakhon nayok||TH|16e|gfx|31kg|lozk|ne:j63v13|1
Nakhon Pathom|nakhon pathom||TH|16f|2izr|2ymc|lg3k|ne:j63v25|1
Nakhon Phanom|nakhon phanom||TH|16g|16q9|3q7t|mgen|ne:j649z3|0
Nakhon Ratchasima|nakhon ratchasima||TH|16h|76h4|37qo|lvt4|ne:j64lep|1
Nakhon Sawan|nakhon sawan||TH|16i|2ecr|3d54|lg58|ne:j64k8p|1
Nakhon Si Thammarat|nakhon si thammarat||TH|16j|4z9r|1stc|lfdg|ne:j64k8j|1
Nakuru|nakuru||KE|1gi|7tfb|-25s|7qbg|ne:j64kk1|1
Nalchik|nalchik|naltchik|RU|s3|6lju|9bmt|9ck3|ne:j64lht|1
Nalut|nalut||LY|ku|1fe9|6tzo|2cn8|ne:j64dc7|1
Nam Định|nam dinh||VN|16k|57n6|4dk8|mrg0|ne:j64j1d|1
Namanga|namanga||KE|1gi|a6h|-jlg|7vy8|ne:j64b9p|1
Namangan|namangan||UZ|16l|g2pc|8scw|fd0c|ne:j64j0z|1
Nampo|nampo|n ampo,nampho|KP|16o|o5lk|8b55|qvzd|ne:j64jex|1
Nampula|nampula||MZ|16p|8bse|-38sg|8f6q|ne:j64lgx|1
Namsos|namsos||NO|18r|6yz|dtk1|2gqg|ne:j64j4f|1
Namtu|namtu||MM|1kd|11hr|4y45|kvjk|ne:j64irn|1
Namur|namur||BE|16q|2a0c|atfk|11ks|ne:j64hnx|1
Nan|nan||TH|16r|1rn7|40yk|llk3|ne:j649tn|1
Nanaimo|nanaimo||CA|9t|1tih|aj7o|-qka7|ne:j64h0h|1
Nancha|nancha||CN|o5|2lnb|a3pg|rpkr|ne:j64f3j|1
Nanchang|nanchang||CN|rf|1ed9s|65b7|ou4d|ne:j64mxj|1
Nanchong|nanchong||CN|1kv|1algw|6lio|mqw1|ne:j64l6z|1
Nancy|nancy||FR|zp|5rjk|afn9|1bu8|ne:j64fql|1
Nanded|nanded||IN|11a|dd98|43x0|gkg8|ne:j64lvt|1
Nandi|nandi|nadi|FJ|1vd|wmk|-3tcc|120ye|ne:j64fll|1
Nandyal|nandyal||IN|33|41ke|3br8|gtk0|ne:j64fhp|1
Nangong|nangong||CN|o3|1rki|80co|oq78|ne:j64etj|1
Nanjing|nanjing|nanjing jiangsu|CN|re|26uqg|6vbc|pghw|ne:j64mxl|1
Nanning|nanning||CN|mf|1ag2g|4w3f|n7sd|ne:j64mvv|1
Nanping|nanping||CN|jy|4ke6|5phc|pbt0|ne:j64dx1|1
Nantes|nantes||FR|1cr|9edl|a4a0|-c9o|ne:j64fnj|1
Nantong|nantong||CN|re|kapk|6v5v|pw9z|ne:j64jmn|1
Nantou|nantou|nantou city|TW|16v|3jbc|54jj|pv75|ne:j648a5|1
Nanuque|nanuque||BR|141|t6o|-3tnk|-8ncc|ne:j6476p|1
Nanyang|nanyang|nanyang henan|CN|o6|15o00|72nb|o49t|ne:j64l73|1
Nanyuki|nanyuki||KE|1gi|rvy|5o|7xyg|ne:j64b8z|1
Napier|napier||NZ|l6|18lk|-8gpg|11x69|ne:j64n5z|1
Naples|naples||IT|bi|1c840|8r50|31wf|ne:j64mvl|1
Naples|naples||US|jp|5mea|5lpp|-hj4u|ne:j648xx|1
Nara|nara||ML|6e|e8r|394o|-1k68|ne:j64krt|1
Narathiwat|narathiwat||TH|16x|1gk0|1dmm|ltnq|ne:j64a0b|1
Narayanganj|narayanganj||BD|gh|4sjq|5298|jeaw|ne:j64hrf|1
Narrabri|narrabri||AU|17q|5gq|-6i1j|w3rm|ne:j64idf|1
Narrogin|narrogin||AU|1ve|39q|-7241|p42a|ne:j64i8n|1
Narsarsuaq|narsarsuaq||GL|vv|41|d3yq|-9qfq|ne:j64lwn|1
Narva|narva||EE|pp|1fok|cq5s|61ab|ne:j64eop|0
Narvik|narvik||NO|18t|ffk|ennc|3pes|ne:j64j33|1
Naryan Mar|naryan mar|nar yan mar|RU|17f|gpm|ehyy|bde6|ne:j64kf5|1
Naryn|naryn||KG|170|14cs|8vnb|gacn|ne:j6456b|1
Nasca|nasca||PE|po|i6c|-36fg|-g28o|ne:j64k9t|1
Nashville|nashville|nashville davidson|US|1q0|isp4|7r3r|-ilm3|ne:j64m9j|1
Nasik|nasik|nashik|IN|11a|vkko|4ac8|ft9w|ne:j64l7v|1
Nasir|nasir||SS|1sk|1cd|1ud0|7356|ne:j64a9h|1
Nassau|nassau||BS||4vvo|5djm|-gku4|ne:j64msn|1
Nata|nata||BW|cd|3p6|-4bxr|5m30|ne:j64i5v|1
Natal|natal||BR|1gk|nbi8|-18l1|-7jxf|ne:j64m1d|1
Natal|natal||BR|2q|l0mk|-1hvy|-cx1n|ne:j64kw7|1
Natara|natara||RU|1hy|a|enuy|qk7r|ne:j64cqn|1
Natashquan|natashquan||CA|1fv|k2|ara1|-d8xn|ne:j647mb|1
Natchez|natchez||US|149|iev|6rh8|-jl5f|ne:j6490h|1
National City|national city||US|bd|37qo|703j|-p3j8|ne:j641db|1
Natitingou|natitingou||BJ|4x|1qf0|27ms|aq4|ne:j64hz1|1
Naujaat|naujaat|repulse bay|CA|19z|rs|e9cf|-ihrh|ne:j64mo5|1
Nauta|nauta||PE|zn|1xg|-z9g|-ftag|ne:j644v7|1
Nautla|nautla||MX|1tm|28a|4bzq|-kqsa|ne:j645z7|1
Navajoa|navajoa|navojoa|MX|1lw|2hkt|5syr|-ngk2|ne:j64cvv|1
Navoi|navoi|navoiy|UZ|174|4lrg|8lhs|e0a6|ne:j649rl|1
Navsari|navsari||IN|fq|3hrs|4gvs|fmnk|ne:j64gfp|1
Nawabganj|nawabganj||BD|1g0|31uh|59nw|ixpo|ne:j64ip5|1
Nawabshah|nawabshah||PK|1l6|4x34|5mie|ens0|ne:j64bel|1
Naxcivan|naxcivan|nakhchivan,naxcivian|AZ|175|2150|8ejg|9qei|ne:j64i4b|1
Naypyidaw|naypyidaw|nay pyi taw|MM|11s|jxlc|48j9|kln3|ne:j64mrv|1
Nazareth|nazareth||IL|n7|38v7|70cg|7kcb|ne:j64fwv|1
Nazran|nazran||RU|q6|2019|99l6|9ljq|ne:j640hl|1
Nazret|nazret|adama|ET|g|a7z0|1tz0|8f0c|ne:j64ktd|1
Nazyvayevsk|nazyvayevsk||RU|1at|9h8|bwra|fajg|ne:j64cf5|1
Nchelenge|nchelenge||ZM|104|ia5|-2054|65ok|ne:j64a27|1
Ndalatando|ndalatando|n dalatando|AO|fe|6a8|-1zr7|371o|ne:j64hrx|1
Ndende|ndende||GA|17v|4s8|-idx|2fu1|ne:j64fm3|1
Ndola|ndola||ZM|ew|8htf|-2sb3|652c|ne:j64jzh|1
Nebbi|nebbi||UG|179|nf6|j3q|6nzl|ne:j63tzh|1
Necochea|necochea||AR|e6|1q3i|-89j4|-clbg|ne:j64l27|1
Needles|needles||US|bd|5dq|7gw4|-okd2|ne:j648hz|1
Neftekamsk|neftekamsk||RU|74|2pud|c0qr|bmp3|ne:j64c7b|1
Nefteyugansk|nefteyugansk||RU|uq|2ewo|d3a1|fkz7|ne:j645kx|1
Negele Boran|negele boran|nagele|ET|g|930|150u|8hfd|ne:j64ktf|1
Nehe|nehe||CN|o5|2bj1|ae5g|qrkw|ne:j64jo1|1
Neiafu|neiafu||TO||5pb|-3zwg|-11agp|ne:j64it3|1
Neiba|neiba||DO|61|jur|3yhm|-fb1y|ne:j646qp|1
Neijiang|neijiang||CN|1kv|vf68|6c9b|mik1|ne:j64l71|1
Neiva|neiva||CO|p8|7k9j|mm6|-g592|ne:j64e97|1
Nekemte|nekemte|nek emte|ET|g|1kca|1y55|7tv8|ne:j64fy7|1
Nelidovo|nelidovo||RU|1s1|jk5|c1tn|70vn|ne:j64c01|1
Nellore|nellore||IN|33|ej5g|33f4|h57f|ne:j64kpx|1
Nelson|nelson||NZ|17e|1aww|-8um6|114sa|ne:j64n5p|1
Nelson|nelson||CA|9t|937|alth|-p4yp|ne:j64h13|1
Nelson House|nelson house||CA|121|1xg|byk5|-l6qc|ne:j64gyb|1
Nema|nema||MR|om|4abk|3k7v|-1jxw|ne:j64d63|1
Nenana|nenana||US|26|23|du6e|-vyeq|ne:j643th|1
Nenjiang|nenjiang||CN|o5|1vb8|ajh4|qua4|ne:j64jnz|1
Nepalganj|nepalganj|nepalgunj|NP|6q|1dow|60fr|hhrb|ne:j64bfv|0
Nephi|nephi||US|1sv|3y5|8ien|-nyxf|ne:j641lx|1
Nerchinsk|nerchinsk||RU|dn|buo|b5ay|ozam|ne:j64cp7|1
Neryungri|neryungri||RU|1hy|1f68|c5as|qq9s|ne:j64jc1|1
Neuchâtel|neuchatel||CH|17g|o4m|a2na|1hf2|ne:j63uft|1
Neumayer Station III|neumayer station iii||AQ||14|-f6zs|-1ohc|ne:j64ivp|1
Neuquén|neuquen||AR|17i|56ss|-8cjg|-el5k|ne:j64m31|1
Nevelsk|nevelsk||RU|1hz|d48|a06r|ueob|ne:j64csp|1
Nevers|nevers||FR|9e|zft|a2j1|ofn|ne:j64fon|1
Nevinnomyssk|nevinnomyssk||RU|1mx|2vos|9kah|8zos|ne:j6459v|1
Nevşehir|nevsehir||TR|17k|1m9z|8a0w|7fxk|ne:j63tot|1
Nevyansk|nevyansk||RU|1nz|lqi|cbli|cwmc|ne:j64cab|1
New Albany|new albany||US|q5|2l2p|87lx|-ie79|ne:j642q5|1
New Amsterdam|new amsterdam||GY|iz|1062|1c84|-cbwk|ne:j64k1x|1
New Bedford|new bedford||US|12y|2x02|8xf5|-f7ev|ne:j6429h|1
New Braunfels|new braunfels||US|1q4|zdc|6d5e|-l15b|ne:j6420p|1
New Delhi|new delhi||IN|gb|6t7p|64og|gjog|ne:j64n1x|1
New Glasgow|new glasgow||CA|19o|foi|9rq1|-dfa5|ne:j647nh|1
New Haven|new haven||US|et|i5da|8uwo|-fmi0|ne:j648wf|1
New Iberia|new iberia||US|zy|sys|6fic|-joh3|ne:j641xn|1
New Liskeard|new liskeard|temiskaming shores|CA|1av|40j|a6ig|-h2pm|ne:j647l3|1
New London|new london||US|et|227m|8v3n|-fgbs|ne:j6428d|1
New Orleans|new orleans||US|zy|gtpk|6fgh|-jarn|ne:j64mtd|1
New Plymouth|new plymouth||NZ|1pa|14ic|-8dcs|11b64|ne:j64n4z|1
New Taipei|new taipei||TW|17r|2bgfg|5d00|q18a|ne:j64l6b|1
New York|new york|new york city,new york newark|US|17s|bc3cw|8qfz|-fuuk|ne:j64n2v|1
Newark|newark||US|17o|6057|8q1o|-fwas|ne:j6496z|1
Newcastle|newcastle|newcastle upon tyne|GB|1s2|iwk0|bsef|-ccz|ne:j64j27|1
Newcastle|newcastle||AU|17q|bla4|-71fp|wjeu|ne:j64mrf|1
Newcastle Waters|newcastle waters||AU|19i|a|-3rfs|slu8|ne:j64i71|1
Newhalen|newhalen||US|26|4g|cssz|-x770|ne:j649il|1
Newman|newman||AU|1ve|3yq|-50aq|pnv9|ne:j64k4j|1
Newport|newport||US|1gf|zgw|8w54|-fa9a|ne:j648wx|1
Neyshabur|neyshabur|nishapur|IR|1g8|4r2c|7rh4|cluw|ne:j6471l|1
Nezahualcoyotl|nezahualcoyotl|ciudad nezahualcoyotl|MX|161|nrzn|45ro|-l84c|ne:j645yd|1
Ngaoundéré|ngaoundere||CM|d|4yil|1khg|2ws8|ne:j64hmx|1
Ngara|ngara||TZ|sd|d16|-j1z|6khw|ne:j64apj|1
Ngorongoro|ngorongoro||TZ|4g|8d0|-p2o|7m2o|ne:j64asx|1
Ngozi|ngozi||BI|17w|gle|-mgw|6e4q|ne:j63zr5|1
Nguigmi|nguigmi|n guigmi|NE|go|dt5|31z8|2t5w|ne:j64b7v|1
Nguru|nguru||NG|1wa|2dnq|2rdw|28ms|ne:j64db5|1
Nha Trang|nha trang||VN|v0|8tk4|2mis|ned0|ne:j64jyv|1
Niagara Falls|niagara falls||US|17s|3a5q|98is|-gxup|ne:j6497l|0
Niamey|niamey||NE|17x|jm0o|2wb7|gbf|ne:j64mbx|1
Niamey|niamey|maradi|NE|127|4zfv|2w3o|1ir8|ne:j64le7|1
Nice|nice|nice cannes|FR|1ew|jva0|9dbm|1k1j|ne:j64jpx|1
Nicosia|nicosia||CY||4t2k|7jcj|75gi|ne:j64msp|1
Nicuadala|nicuadala||MZ|1wu|5cx|-3rv1|7w3p|ne:j64bt7|1
Nieuw Amsterdam|nieuw amsterdam||SR|en|3t3|19lo|-bsx8|ne:j643a7|1
Nieuw Nickerie|nieuw nickerie||SR|180|cc8|19ww|-c7qk|ne:j6498p|1
Niğde|nigde||TR|184|1y8v|850w|7fp8|ne:j63tt7|1
Niigata|niigata||JP|186|c7np|84lc|tsu8|ne:j64jov|1
Nikel|nikel||RU|15q|c8q|evla|6h64|ne:j64bx7|0
Nikolayevsk|nikolayevsk||RU|1ua|cdo|apxd|9qid|ne:j645fl|1
Nikolayevsk na Amure|nikolayevsk na amure|nikolayevsk on amur|RU|un|ky8|be3s|u5vo|ne:j64jd7|1
Nikolski|nikolski||US|26|i|bch4|-106zp|ne:j649i3|1
Nikopol|nikopol||UA|h4|2sp0|a70y|7dha|ne:j649oz|1
Nîmes|nimes||FR|y7|3mtn|9e74|xkc|ne:j64fof|1
Nimule|nimule||SS|hx|6q|rs0|6vas|ne:j64kbf|0
Ninde|ninde|jiaocheng|CN|jy|6qcd|5pv8|pmat|ne:j64dx7|1
Ningan|ningan|ning an|CN|o5|165o|9i29|rqyr|ne:j64f43|1
Ningbo|ningbo||CN|1x7|157so|6ekj|q1vd|ne:j64lt1|1
Ninh Bình|ninh binh||VN|18b|2sph|4ca7|mppi|ne:j649yp|1
Nioro du Sahel|nioro du sahel||ML|u2|b4l|39io|-21zw|ne:j64d4z|1
Nipigon|nipigon||CA|1av|xg|ai7u|-iwxw|ne:j64h4x|1
Niquelândia|niquelandia||BR|le|l91|-33nc|-adzw|ne:j64hd3|1
Niš|nis||RS|18f|5cwg|9ac8|4ozc|ne:j64h9p|1
Niterói|niteroi||BR|1gm|w5sx|-4wp4|-98k8|ne:j647fx|1
Nizamabad|nizamabad||IN|1pw|8brt|4028|gqmg|ne:j64fiz|1
Nizhenvartovsk|nizhenvartovsk|nizhnevartovsk|RU|uq|58zt|d26e|gew8|ne:j64j7v|1
Nizhnekamsk|nizhnekamsk||RU|1pn|50s9|bxbo|b3ug|ne:j64cdv|1
Nizhneudinsk|nizhneudinsk||RU|qg|xfi|brld|l83p|ne:j64j9h|1
Nizhneyansk|nizhneyansk||RU|1hy|b4|fb6l|t5wa|ne:j64mfp|1
Nizhny Novgorod|nizhny novgorod|gor kiy,nizhniy novgorod,novgorod|RU|18e|re40|c2om|9fhp|ne:j64mef|1
Nizhny Tagil|nizhny tagil||RU|1nz|862k|ceww|curq|ne:j64lj3|1
Nizhnyaya Tura|nizhnyaya tura||RU|1nz|179w|ckhw|cten|ne:j64caj|1
Nizhyn|nizhyn||UA|d4|2hq8|axxp|6u2f|ne:j649nd|1
Nizwa|nizwa||OM|a|1jm4|4wwg|cbwy|ne:j64kfp|1
Njombe|njombe|njombe mjini|TZ|qf|101w|-1zzk|7gac|ne:j64art|1
Nkawkaw|nkawkaw||GH|i2|1ccr|1ejl|-60o|ne:j64ff5|1
Nkhata Bay|nkhata bay||MW|18g|h24|-2hi4|7cns|ne:j64bsl|1
Nkhotakota|nkhotakota||MW|18h|1a6m|-2rnv|7cns|ne:j64bsp|1
Nkongsamba|nkongsamba||CM|zc|2ibr|129w|24p4|ne:j64hlf|1
Nogales|nogales||MX|1lw|3tf5|6pju|-ns22|ne:j64llx|1
Noginsk|noginsk||RU|155|4x9f|bz3k|88ww|ne:j64c1z|1
Noginsk|noginsk||RU|j3|4x9f|dtk1|jjyl|ne:j64j8z|1
Nogliki|nogliki||RU|1hz|7si|b3y5|uooj|ne:j64jdl|1
Nokaneng|nokaneng||BW|19b|1cz|-47rs|4ru4|ne:j64i5d|1
Nola|nola||CF|1iz|kop|r9l|3fyy|ne:j64h8z|1
Nome|nome||US|26|2ot|dtqd|-zga8|ne:j64maf|1
Nong Khai|nong khai||TH|18i|28mx|3twt|m0t3|ne:j649xz|1
Nongan|nongan|nong an|CN|rj|3162|9its|qtth|ne:j64eyf|1
Nonthaburi|nonthaburi||TH|18j|5jhy|2yqp|ljc1|ne:j649vp|1
Nord|nord||GL|173|a|hij2|-3tcg|ne:j64jqv|1
Nordvik|nordvik||RU|1pq|0|fv45|nwf0|ne:j64co5|1
Norfolk|norfolk||US|1u5|mgjh|7wc4|-gckw|ne:j64m9n|1
Norfolk|norfolk||US|17a|jba|90an|-kvsw|ne:j648qb|1
Norilsk|norilsk||RU|1pq|3jzl|ev14|iwqy|ne:j64lkh|1
Norman|norman||US|1ao|2flh|7jtj|-kv41|ne:j648r1|1
Norman Wells|norman wells||CA|19k|sj|dzqd|-r6s4|ne:j64h23|1
Norrköping|norrkoping||SE|1y1|1we7|ck4i|3gu3|ne:j649lz|1
Norseman|norseman||AU|1ve|rw|-6wgg|q3k2|ne:j64k43|1
North Battleford|north battleford||CA|1jo|f00|bb5e|-n7ip|ne:j64k1h|1
North Bay|north bay||CA|1av|12pm|9x94|-h11g|ne:j64m2d|1
North Platte|north platte||US|17a|jhb|8ter|-lljt|ne:j648qf|1
North Shore|north shore|takapuna|NZ|56|4en9|-7vvt|11gku|ne:j64n4p|1
Northam|northam||AU|1ve|4in|-6s9i|p03q|ne:j64k4t|1
Norway House|norway house||CA|121|4mo|bkeq|-kyvx|ne:j64kyl|1
Norwich|norwich||GB|18v|436s|ba3k|a14|ne:j64ah5|1
Nottingham|nottingham||GB|19m|hp1c|bcpz|-910|ne:j64ajb|1
Nouadhibou|nouadhibou||MR|fx|1uxe|4h9k|-3nls|ne:j64lwx|1
Nouakchott|nouakchott||MR|19n|fwn4|3vk0|-3f9l|ne:j64mlb|1
Nouméa|noumea||NC|1n7|1zt0|-4rs1|zoaj|ne:j64jh7|1
Nouna|nouna||BF|w4|mew|2q7u|-ts8|ne:j63zsx|1
Nova Cruz|nova cruz||BR|1gk|hvi|-1dx4|-7lgg|ne:j64gxn|1
Nova Friburgo|nova friburgo||BR|1gm|3opj|-4rrc|-948o|ne:j64k17|1
Nova Iguaçu|nova iguacu||BR|1gm|i3on|-4vgo|-9bf0|ne:j647fn|1
Nova Lima|nova lima||BR|141|1w7j|-4a60|-9eck|ne:j64761|1
Nova Viçosa|nova vicosa||BR|60|1770|-3tyo|-8fs4|ne:j64k0v|1
Novara|novara||IT|1dr|25v2|9qp0|1uig|ne:j6468v|1
Novi Sad|novi sad||RS|rw|4typ|9p5k|495v|ne:j64ha3|1
Novo Airão|novo airao||BR|2q|6zd|-k80|-d28u|ne:j64kw1|1
Novo Hamburgo|novo hamburgo||BR|1gl|isou|-6d8o|-aylk|ne:j64gs3|1
Novo Horizonte|novo horizonte||BR|1o6|n9q|-4ll0|-ajs8|ne:j64hjz|1
Novoaltaysk|novoaltaysk||RU|2h|1yii|bg15|hztw|ne:j64cg3|1
Novocherkassk|novocherkassk||RU|1h1|3ku6|a5w8|8l9c|ne:j645ef|1
Novokuybishevsk|novokuybishevsk|novokuybyshevsk|RU|1ib|39ji|bdvk|ap6n|ne:j645k5|1
Novokuznetsk|novokuznetsk||RU|uc|bkdc|biqk|io6m|ne:j64ljj|1
Novolazarevskaya Station|novolazarevskaya station||AQ||1y|-fa5w|-2jfq|ne:j64ivn|1
Novomoskovsk|novomoskovsk||RU|1rt|2t2e|bld0|86wo|ne:j645f3|1
Novorossiysk|novorossiysk||RU|wb|56m8|9l50|83fn|ne:j64kev|1
Novoshakhtinsk|novoshakhtinsk||RU|1h1|24ra|a8lg|8k0w|ne:j645et|1
Novosibirsk|novosibirsk||RU|19q|trrc|bsmn|hs3x|ne:j64mex|1
Novotroitsk|novotroitsk||RU|1b5|29xm|az28|ci2s|ne:j645jb|1
Novozybkov|novozybkov||RU|a0|xla|b9d0|6uhl|ne:j645bd|1
Novy Port|novy port||RU|1vz|1dq|eid3|fmpv|ne:j64j6v|1
Novy Urengoy|novy urengoy||RU|1vz|20p0|e5wh|gfb0|ne:j64j73|1
Novyy Uoyin|novyy uoyin|novy uoyan|RU|ah|388|c152|ny57|ne:j64jad|1
Nowra|nowra||AU|17q|214t|-7h5o|wa1c|ne:j64iad|1
Noyabrsk|noyabrsk||RU|1vz|2dbg|dje9|g7gl|ne:j64j77|1
Nsanje|nsanje||MW|19r|gsu|-3mj3|7k4b|ne:j63xg5|0
Nsukka|nsukka||NG|io|2dnt|1gzi|1kyy|ne:j64da3|1
Ntcheu|ntcheu||MW|19s|825|-36br|7f8d|ne:j63xf7|1
Ntungamo|ntungamo||UG|19t|cnk|-6sa|6hiq|ne:j63u85|1
Nueva Gerona|nueva gerona||CU|qi|jq6|4out|-hqw0|ne:j64e63|1
Nueva Imperial|nueva imperial||CL|xd|ehl|-8ax4|-fmyo|ne:j646vv|1
Nueva Ocotepeque|nueva ocotepeque||HN|1aa|6rw|33ea|-j44s|ne:j63tj7|1
Nueva Rosita|nueva rosita||MX|eb|s9u|5znw|-lp0o|ne:j645rf|1
Nueva San Salvador|nueva san salvador|santa tecla|SV|xg|2o7q|2xic|-j4ys|ne:j63ww5|1
Nueve de Julio|nueve de julio|9 de julio|AR|e6|qse|-7li4|-d1tw|ne:j647tb|1
Nuevitas|nuevitas||CU|bf|15om|4m8w|-gk6c|ne:j64e7p|1
Nuevo Casas Grandes|nuevo casas grandes||MX|dd|16ay|6ipl|-n4nj|ne:j64cu7|1
Nuevo Laredo|nuevo laredo||MX|1oz|7hpq|5w6w|-lc4s|ne:j64lm7|1
Nuevo Rocafuerte|nuevo rocafuerte|new rocafuerte|PE|zn|14|-775|-g5sg|ne:j64b1z|0
Nuku'alofa|nuku alofa|nukualofa|TO||wvw|-4j3t|-11k0e|ne:j64ms3|1
Nukus|nukus||UZ|t9|4xh2|93p8|crzq|ne:j64lct|1
Numan|numan||NG|e|1nw1|20zw|2kwg|ne:j64dbx|1
Numto|numto||RU|uq|a|dn97|faet|ne:j64j7x|1
Nuquí|nuqui||CO|dr|245|17v8|-gk95|ne:j64ea7|1
Nur-Sultan|nur sultan|astana|KZ|3q|7eo4|aywz|fb52|ne:j64mlx|1
Nürnberg|nurnberg|nuremberg|DE|7k|fswo|alk4|2dhs|ne:j64jih|1
Nusaybin|nusaybin||TR|12d|39ss|7y2m|8u1k|ne:j644nb|0
Nuuk|nuuk||GL|vw|bf2|drcv|-b367|ne:j64ml7|1
Nuussuaq|nuussuaq||GL|1fb|5o|fvx6|-c8c2|ne:j64jqz|1
Nyac|nyac||US|26|2s|d2pl|-ya3x|ne:j643nl|1
Nyagan|nyagan||RU|uq|1489|dbix|e0hi|ne:j64j7p|1
Nyahanga|nyahanga||TZ|15v|cf0|-idx|76vg|ne:j64aon|1
Nyala|nyala|niyala|SD|1ma|8er9|2l20|5c1w|ne:j64mcl|1
Nyanza|nyanza||RW|1mm|4trt|-i4o|6dh4|ne:j64avb|1
Nyeri|nyeri||KE|cd|13f0|-37u|7x46|ne:j63wrl|1
Nyimba|nyimba||ZM|i2|114|-349j|6lqc|ne:j64a33|1
Nyingchi|nyingchi||CN|1vt|2s|6bvp|k8iv|ne:j64jil|1
Nyíregyháza|nyiregyhaza||HU|1o4|3shc|aa3p|4nkz|ne:j644ov|1
Nyköping|nykoping||SE|1oa|la6|clfc|3nae|ne:j63un7|1
Nyukzha|nyukzha||RU|2t|a|c474|q2df|ne:j64cp1|1
Nyunzu|nyunzu||CD|tw|bvp|-19wo|606f|ne:j64faf|1
Nzega|nzega||TZ|1og|kig|-whc|740o|ne:j64ap1|1
Nzérékoré|nzerekore||GN|1a4|3lq1|1nvk|-1w4s|ne:j64lzz|1
Nzeto|nzeto|n zeto|AO|1wr|g8z|-1js8|2r88|ne:j64hsb|1
Oak Ridge|oak ridge||US|1q0|pw4|7puz|-i289|ne:j6493v|1
Oakland|oakland||US|bd|wdbz|83fd|-q72b|ne:j64jtv|1
Oamaru|oamaru||NZ|1bj|a14|-9o2c|10nek|ne:j64n55|1
Oatlands|oatlands||AU|1pl|w5|-92dw|vl36|ne:j64inp|1
Oaxaca|oaxaca|oaxaca de juarez|MX|1a6|bdig|3nt7|-kpwr|ne:j64lmf|1
Ob|ob||RU|19q|utp|bsd9|hq6d|ne:j64chp|1
Oban|oban||NZ|1mr|8m|-a1sc|101ky|ne:j64n73|1
Óbidos|obidos||BR|1ck|lab|-eqk|-bwe8|ne:j64k03|1
Obihiro|obihiro||JP|oo|3q6a|9794|uopg|ne:j64f4t|1
Obluchye|obluchye||RU|1w8|7ps|ai34|s3g1|ne:j645pp|1
Obninsk|obninsk||RU|sp|2av4|bt04|7uk8|ne:j64c15|1
Obo|obo||CF|nw|9xz|15o0|5oh4|ne:j64mp5|1
Obock|obock||DJ|1a8|dps|2kdy|99zs|ne:j64ekb|1
Obuasi|obuasi||GH|4m|3uz9|1brk|-ct4|ne:j64fen|1
Ocala|ocala||US|jp|313a|697m|-hlsr|ne:j648yj|1
Ocaña|ocana||CO|18x|1sfr|1rl0|-fpz0|ne:j64ebd|1
Oceanside|oceanside||US|bd|d2ke|74bx|-p5d2|ne:j648hf|1
Ocotal|ocotal||NI|19w|q6g|2x64|-ij8a|ne:j63vbn|1
Ocumare del Tuy|ocumare del tuy||VE|144|3k54|2634|-eba0|ne:j6438b|1
Odense|odense||DK|1o2|3e32|bvh0|2849|ne:j64ghn|1
Odessa|odessa|odesa|UA|1ab|l8ns|9yqg|6ky1|ne:j64lcd|1
Odessa|odessa||US|1q4|29ty|6tq0|-lxvc|ne:j64iyp|1
Odienné|odienne||CI|gd|12gx|21ds|-1mhk|ne:j64gix|1
Ogbomosho|ogbomosho||NG|1by|kdso|1qqw|wp8|ne:j64lmt|1
Ogden|ogden||US|1sv|832g|8u5g|-nzy8|ne:j648n1|1
Oğuz|oguz||AZ|1ah|5b0|8swk|a66v|ne:j63z43|1
Ōita|oita||JP|1al|9mdn|74i8|s7ez|ne:j64f01|1
Ojinaga|ojinaga||MX|dd|h2o|6bxo|-mdms|ne:j64cub|1
Okahandja|okahandja||NA|1bk|g3z|-4plg|3mh8|ne:j64dkl|1
Okandja|okandja|okondja|GA|nx|5ir|-59p|2ycp|ne:j64fml|1
Okara|okara||PK|1f3|4skg|6lqg|fqqs|ne:j64bdz|1
Okayama|okayama||JP|1am|ika4|7fj4|spb7|ne:j646lz|1
Okha|okha||RU|1hz|khs|bhdn|umzr|ne:j64llj|1
Okhotsk|okhotsk||RU|un|4aq|cq7a|up2i|ne:j64llf|1
Oklahoma City|oklahoma city||US|1ao|gw0w|7lpc|-kwh2|ne:j64m8z|1
Oktyabrsk|oktyabrsk|kandyagash|KZ|3s|lr8|alqj|cb8x|ne:j64g01|1
Oktyabrskiy|oktyabrskiy|oktyabrsky|RU|74|2bhk|bo7s|bgi0|ne:j645h7|1
Oktyabrsky|oktyabrsky|oktyabrskiy|RU|sq|16m|bacs|xhjn|ne:j64jfz|1
Olavarría|olavarria||AR|e6|1uls|-7wq0|-cxic|ne:j64k2t|1
Olbia|olbia||IT|1jn|z06|8rp3|21f3|ne:j64dqh|1
Oldeani|oldeani||TZ|4g|668|-pug|7mb0|ne:j64at1|1
Oldenburg|oldenburg||DE|182|3l7m|bdyc|1rfc|ne:j646gb|1
Olenyok|olenyok|olenek|RU|1hy|a|eoqq|o3o4|ne:j64jcp|1
Olgiy|olgiy|olgii|MN|7i|qye|ahkp|ja24|ne:j64dh5|1
Olinda|olinda||BR|1d4|jrao|-1pq8|-7gwk|ne:j6482f|1
Olmaliq|olmaliq||UZ|1pk|2liv|8r7c|ewzy|ne:j649st|1
Olmos|olmos||PE|y1|7k8|-1a50|-h3cs|ne:j64ayt|1
Olomouc|olomouc||CZ|14w|2650|amy4|3p3o|ne:j646hz|1
Olongapo|olongapo||PH|1wt|6iv8|36fc|ps3w|ne:j64ckn|1
Olovyannaya|olovyannaya||RU|dn|6d3|ax4s|orpu|ne:j64jaz|1
Olsztyn|olsztyn||PL|1uw|401a|bj4g|4e0w|ne:j64617|1
Olympia|olympia||US|1ux|3d4o|a2y4|-qcaq|ne:j64l97|1
Olyokminsk|olyokminsk||RU|1hy|7ps|cyug|psye|ne:j64cqf|1
Omagh|omagh||GB|1ar|g8w|bpao|-1kbs|ne:j644d7|1
Omaha|omaha||US|17a|iss6|8u7k|-kktg|ne:j64m8x|1
Omaruru|omaruru||NA|iq|8wr|-4leg|3f2u|ne:j63w8b|1
Omboué|omboue||GA|1af|1ab|-c32|1zdg|ne:j64fmd|1
Omchak|omchak|omtschak|RU|111|a|d7kd|vpbz|ne:j645q5|1
Omdurman|omdurman||SD|us|1fc47|3chz|6ym8|ne:j64lfx|1
Ometepec|ometepec||MX|mm|ncv|3kpd|-l3ew|ne:j64kh7|1
Omolon|omolon||RU|dy|t6|dzh0|yefc|ne:j64j5p|1
Omsk|omsk||RU|1at|obrs|bsbj|fqcc|ne:j64ljf|1
Omsukchan|omsukchan||RU|111|38p|deid|xe5s|ne:j64jdh|1
Omutninsk|omutninsk||RU|vg|pb4|ckm5|b6go|ne:j64c9f|1
Ondjiva|ondjiva|onjiva|AO|fi|7uh|-3npk|3ddg|ne:j64htf|1
Ondo|ondo|ondo city|NG|1au|5ib1|1ipk|11cg|ne:j64d8l|1
Öndörkhaan|ondorkhaan|ondorhaan|MN|o7|bcz|a53j|nps4|ne:j64jf5|1
Onega|onega||RU|4a|hid|dp9j|85sz|ne:j64ked|1
Ongjin|ongjin||KP|pe|1he3|84q3|qv9f|ne:j64di5|1
Ongole|ongole||IN|33|4cj0|3c2c|h5o4|ne:j64fi3|1
Ongwediva|ongwediva||NA|1bd|jbc|-3t6w|3dok|ne:j64ki3|1
Onitsha|onitsha|asaba|NG|2y|1km6|1bdo|1gbc|ne:j64d9d|1
Onslow|onslow||AU|1ve|fx|-4n40|oo37|ne:j64k4d|1
Ontario|ontario||US|1b3|9ej|9fpm|-p2hf|ne:j641kl|1
Onverwacht|onverwacht||SR|1ce|1mh|177k|-btxc|ne:j640d7|1
Oostanay|oostanay|kostanay|KZ|1fh|52sl|benl|dmyj|ne:j64jrp|1
Opobo|opobo||NG|13|qxr|z9k|1mc0|ne:j64d6z|1
Opole|opole||PL|1aw|2tec|av36|3ucx|ne:j6461z|1
Opuwo|opuwo||NA|wn|3qx|-3vck|2ymw|ne:j64dkd|1
Oradea|oradea||RO|89|4kzq|a31g|4p4w|ne:j644qn|1
Oral|oral|ural sk|KZ|1v7|4hvg|azlz|b03q|ne:j64ktz|1
Oran|oran|wahran|DZ|1ay|h3qo|7njz|-4sr|ne:j64mqp|1
Orange|orange||AU|17q|uch|-74sg|vygo|ne:j64m5t|1
Orange Walk|orange walk|orange walk town|BZ|1b0|g2r|3vl4|-izc0|ne:j64hkz|1
Orangeburg|orangeburg||US|1m7|rdc|76go|-hbxq|ne:j642l7|1
Orangeville|orangeville||CA|1av|p6o|9ev7|-h5xd|ne:j64h2t|1
Oranjemund|oranjemund||NA|tb|6k0|-64af|3irw|ne:j64djv|0
Oranjestad|oranjestad||AW||1h2f|2ooo|-f0ci|ne:j64itl|1
Orcadas Station|orcadas station||AQ||19|-d0m9|-9l5x|ne:j64iwb|1
Ordu|ordu||TR|1b1|3bot|8sd0|847f|ne:j64ag1|1
Örebro|orebro||SE|1b2|2425|cper|39fs|ne:j649lv|1
Orekhovo-Zuevo|orekhovo zuevo|orekhovo zuyevo|RU|155|307r|bypk|8crs|ne:j645db|1
Orel|orel|oryol|RU|1b4|7654|bcpw|7qbg|ne:j64ken|1
Orenburg|orenburg||RU|1b5|bsjg|b3jc|bt8c|ne:j64lj7|1
Orillia|orillia||CA|1av|sx7|9k4w|-h0s7|ne:j647jz|1
Oriximiná|oriximina||BR|1ck|rgd|-dks|-bz3g|ne:j64gnv|1
Orizaba|orizaba||MX|1tm|7m6d|41g4|-ktgk|ne:j645yx|1
Orlando|orlando||US|jp|sxo0|63zz|-hfy4|ne:j64lb3|1
Orléans|orleans||FR|cg|4no5|a9lo|ens|ne:j64fpd|1
Orlu|orlu||NG|q1|77r|18ml|1i9p|ne:j64d73|1
Ormac|ormac|ormoc|PH|yp|3lb4|2ddf|qph7|ne:j64cl5|1
Örnsköldsvik|ornskoldsvik||SE|1um|let|dkkc|40f3|ne:j64j0n|1
Orocue|orocue||CO|c1|26r|10zu|-fago|ne:j64ebh|1
Orodara|orodara||BF|x6|edk|2coc|-11vc|ne:j63zs3|1
Orongen Zizhiqi|orongen zizhiqi||CN|17d|uyo|au6b|qilr|ne:j646nh|1
Orsha|orsha||BY|1u7|2wbq|bon5|6iqf|ne:j64i3t|1
Orsk|orsk||RU|1b5|5agk|az50|ckdd|ne:j64j7j|1
Oruro|oruro||BO|1ba|5a79|-3uqf|-edz8|ne:j64k3j|1
Ōsaka|osaka|osaka kobe|JP|1bb|6q2i8|7g5c|t17a|ne:j64n1t|1
Osakarovka|osakarovka|osakarov|KZ|1fc|5mx|au9z|fjyb|ne:j6462x|1
Osh|osh||KG|1bc|8dwt|8ot8|flng|ne:j64bfh|1
Oshawa|oshawa||CA|1av|9nyr|9ekw|-gwes|ne:j647kp|1
Oshikango|oshikango||NA|1ai|9l3|-3q97|3ej4|ne:j64dkv|1
Oshkosh|oshkosh||US|1vm|1k3e|9fp7|-iz75|ne:j6495j|1
Oshogbo|oshogbo|osogbo|NG|1bi|8r05|1nyg|z6o|ne:j64d8z|1
Osijek|osijek||HR|1bf|21d1|9rgw|404w|ne:j64eoh|1
Oskemen|oskemen|ust kamenogorsk|KZ|hz|6u6z|apq4|hpgl|ne:j64lyh|1
Oslo|oslo||NO|1bg|hwag|cuc2|2axk|ne:j64mup|1
Osnabrück|osnabruck||DE|182|4yg4|b7ec|1q44|ne:j64el7|1
Osório|osorio||BR|1gl|qpw|-6ek0|-arvw|ne:j6479v|1
Osorno|osorno||CL|zq|3axf|-8p1g|-foi8|ne:j64krd|1
Östersund|ostersund||SE|ry|zmq|djix|351g|ne:j64k87|1
Ostrava|ostrava||CZ|14w|a9kj|aohs|3wtg|ne:j64eol|1
Otar|otar||KZ|2e|8o6|9bwy|g4cr|ne:j64g4n|1
Otaru|otaru||JP|oo|32y8|998v|u7sn|ne:j64f55|1
Otavi|otavi||NA|1bk|3iq|-47jk|3pt8|ne:j63w9l|1
Otjiwarongo|otjiwarongo||NA|1bk|j5b|-4dv7|3ke8|ne:j64dkp|1
Otradnyy|otradnyy|otradny|RU|1ib|12of|bfv6|b076|ne:j64ccn|1
Ōtsu|otsu||JP|1kl|bic0|7i40|t4cy|ne:j646pd|1
Ottawa|ottawa|ottawa gatineau|CA|1av|ojhk|9qga|-g84c|ne:j64moj|1
Ottumwa|ottumwa||US|qb|k1q|8sgh|-jt2s|ne:j641nx|1
Oturkpo|oturkpo|otukpo|NG|7z|1gn0|1jhc|1qqc|ne:j64d77|1
Otuzco|otuzco||PE|xg|7ti|-1oyg|-gu90|ne:j644ut|1
Ouadda|ouadda||CF|nz|46y|1q8v|4su8|ne:j64h9v|1
Ouagadougou|ouagadougou||BF|s8|omko|2ngr|-bs3|ne:j64mrp|1
Ouahigouya|ouahigouya||BF|1w5|1pcg|2wpk|-io8|ne:j64io7|1
Ouargla|ouargla|ghardina|DZ|1bn|3s0f|6uok|157c|ne:j64l4h|1
Oudtshoorn|oudtshoorn||ZA|1vf|1n6s|-773s|4r7w|ne:j64kbx|1
Ouésso|ouesso||CG|1iy|luo|cf8|3fuc|ne:j64krz|1
Ouezzane|ouezzane|ouazzane|MA|kw|1hqy|7glj|-16z8|ne:j64brb|1
Ouidah|ouidah||BJ|4y|1sfj|1d2s|g4k|ne:j64hyt|1
Oujda|oujda|taza|MA|1b7|8rvz|7fo4|-eqk|ne:j64lhf|1
Oulu|oulu||FI|19h|2xio|dxjk|5gj0|ne:j64ktn|1
Oum el Bouaghi|oum el bouaghi||DZ|1bu|25sl|7omc|1j64|ne:j63zix|1
Oum Hadjer|oum hadjer||TD|7b|evb|2umk|47vl|ne:j64eej|1
Ourense|ourense||ES|kb|2j4r|92mc|-1oq4|ne:j64j21|1
Ourinhos|ourinhos||BR|1o6|23gn|-4x8k|-aoss|ne:j647z1|1
Outjo|outjo||NA|wn|525|-4b5z|3gjc|ne:j64dk7|1
Ouyen|ouyen||AU|1tx|12w|-7ikm|ui4f|ne:j64igt|1
Ovalle|ovalle||CL|ey|1niq|-6k18|-f9dt|ne:j64kr5|1
Oviedo|oviedo||ES|1et|51tv|9aht|-18zg|ne:j64a8f|1
Owando|owando||CG|fl|qae|-3p8|3eu8|ne:j64ggn|1
Owen Sound|owen sound||CA|1av|hgh|9jvm|-hbuc|ne:j647jx|1
Owensboro|owensboro||US|uf|1gc1|83gy|-io65|ne:j64931|1
Owerri|owerri||NG|q1|4lxa|16du|1i7o|ne:j63w5z|1
Owo|owo||NG|1au|5xem|1jk4|174s|ne:j64d8h|1
Oxford|oxford||GB|1bx|44rg|b3go|-9n8|ne:j64aiv|1
Oxford House|oxford house||CA|121|54|bs00|-kf2y|ne:j64gyj|1
Oyem|oyem||GA|1vo|xi7|ch2|2hdl|ne:j64kpt|1
Oymyakon|oymyakon|oimekon|RU|1hy|dw|dld2|ulma|ne:j6489j|1
Oyo|oyo||NG|1by|fryg|1oko|ubo|ne:j64d93|1
Oytal|oytal||KZ|1x6|hht|974x|fp8l|ne:j64gap|1
Ozamis|ozamis|ozamiz|PH|145|23gu|1quu|qjl8|ne:j64ckh|1
Pa-an|pa an|hpa an|MM|u3|12kw|3m0k|kx7r|ne:j6402z|1
Paamiut|paamiut||GL|vw|1fq|dafd|-amzj|ne:j64jqj|1
Paarl|paarl||ZA|1vf|40yh|-7810|42ao|ne:j64bj3|1
Pabna|pabna||BD|1g0|2ye8|556s|j4no|ne:j64ip1|1
Pacasmayo|pacasmayo||PE|xg|ub6|-1l3q|-h1yy|ne:j64k9f|1
Pachuca|pachuca||MX|of|6ul9|4bmw|-l5t0|ne:j64d1n|1
Padang|padang||ID|1nl|ibq0|-7e5|lid9|ne:j64mhd|1
Padangpanjang|padangpanjang|padang,padang panjang|ID|1nl|y0w|-3gw|litj|ne:j64dn5|1
Padangsidempuan|padangsidempuan|padang sidempuan|ID|1nn|5pxe|apr|l9zy|ne:j64dmf|1
Padilla|padilla||BO|e1|294|-44x0|-ds7w|ne:j64hbt|1
Paducah|paducah||US|uf|vvp|7y51|-izn4|ne:j6492z|1
Pagadian|pagadian||PH|1wv|3f52|1ole|qgzi|ne:j64ckf|1
Pago Pago|pago pago||AS||9pc|-325q|-10l6i|ne:j64m71|1
Paita|paita||PE|1dv|17br|-139w|-hdxc|ne:j64k8v|1
Pakalongan|pakalongan|pekalongan|ID|r5|5tvk|-1h30|ni7w|ne:j64dzd|1
Pakhachi|pakhachi||RU|sq|a|czg8|108ec|ne:j6466h|1
Pakokku|pakokku||MM|115|2py2|4klk|kdoy|ne:j64irj|1
Pakwach|pakwach||UG|179|dj9|j28|6qwg|ne:j64alb|1
Pakxe|pakxe|pakse|LA|ct|27av|38ol|mohz|ne:j64dhf|1
Pala|pala||TD|13a|rd6|205c|37he|ne:j64eex|1
Palana|palana||RU|sq|2tz|cnw8|ya6k|ne:j64mh5|1
Palangkaraya|palangkaraya||ID|sk|36f5|-h1s|oexo|ne:j64fc5|1
Palapye|palapye||BW|cd|nne|-4u2k|5tc4|ne:j64i63|1
Palatka|palatka||RU|111|gjw|cvqg|wcco|ne:j64jdf|1
Palatka|palatka||US|jp|gjw|6crh|-hi0x|ne:j642g3|1
Palembang|palembang||ID|1nm|11hjc|-mz9|mg8p|ne:j64mif|1
Palermo|palermo||IT|1kw|ihw8|866u|2uzt|ne:j64mhh|1
Pali|pali||IN|1fz|4i47|5j00|fptf|ne:j64g9f|1
Palikir|palikir||FM||3l1|1hda|xwak|ne:j64l51|1
Pallasovka|pallasovka||RU|1ua|d83|aq65|a1ph|ne:j64c3d|1
Pallisa|pallisa||UG|1c6|nq1|8u2|783q|ne:j63txz|1
Palm Coast|palm coast||US|jp|11hd|6bx0|-heq1|ne:j642fx|1
Palm Springs|palm springs||US|bd|8d0j|78mm|-oz6b|ne:j648i7|1
Palma|palma|palma de mallorca|ES|qj|81y5|8hcv|kha|ne:j64kad|1
Palma Soriano|palma soriano||CU|1jf|27ca|4bzw|-gaes|ne:j646cv|1
Palmas|palmas||BR|1qs|51kj|-26zt|-acla|ne:j64kwz|1
Palmas|palmas||BR|1ch|u7i|-5obk|-b58g|ne:j647ap|1
Palmeira dos Índios|palmeira dos indios||BR|24|vpj|-20nq|-7uja|ne:j647el|1
Palmer|palmer||US|26|a47|d7b1|-vyk7|ne:j64j0h|1
Palmer Station|palmer station||AQ||1a|-dvpk|-dq6t|ne:j64iud|1
Palmerston North|palmerston north||NZ|11q|1rkw|-8nd3|11mzs|ne:j64n57|1
Palopo|palopo||ID|1nh|1vw|-nx3|prqz|ne:j64e2f|1
Palu|palu||ID|1ni|d4kd|-6zy|pomy|ne:j64kjb|1
Pampa del Infierno|pampa del infierno||AR|cm|295|-5olq|-d3yq|ne:j647x1|1
Pamplona|pamplona||ES|eo|5vu9|96eg|-cqc|ne:j64j2x|1
Pamplona|pamplona||CO|18x|15cj|1l0w|-fknc|ne:j64eb7|1
Panaji|panaji||IN|lc|1elu|3bjc|ftl0|ne:j640rv|1
Panama City|panama city|ciudad de panam,panama|PA|1c8|rgfc|1x7o|-h1p2|ne:j64mdn|1
Panama City|panama city||US|jp|257s|6gpe|-icx5|ne:j642hv|1
Panda|panda||MZ|q7|gq|-55o5|7fzb|ne:j64btp|1
Panevežys|panevezys||LT|1c9|2qb1|by3c|581g|ne:j6452x|1
Pangkalpinang|pangkalpinang|pangkal pinang|ID|6k|2p65|-g1s|mr24|ne:j64kmd|1
Pangnirtung|pangnirtung||CA|19z|10o|e6ad|-e3bw|ne:j64k1p|1
Panipat|panipat||IN|nr|69xk|6aus|ghwk|ne:j64fh7|1
Pannawonica|pannawonica||AU|1ve|j2|-4my6|oxki|ne:j64i7j|1
Panshi|panshi||CN|rj|1uiw|97ci|r0nl|ne:j64eyx|1
Pánuco|panuco||MX|1tm|r90|4q7w|-l1n0|ne:j64d2t|1
Panzhihua|panzhihua||CN|1kv|9w3t|5ov0|lsyc|ne:j64jkb|1
Papasquiaro|papasquiaro|santiago papasquiaro|MX|hp|hjy|5blc|-mkt4|ne:j64cup|1
Papeete|papeete||PF||2tm7|-3rae|-w22b|ne:j64m7l|1
Paphos|paphos||CY|1cb|rqx|7g6f|6y69|ne:j6405f|1
Paracatu|paracatu||BR|141|1ild|-3opo|-a1ng|ne:j64gqt|1
Parachinar|parachinar||PK|j7|16yt|79kg|f0wg|ne:j6454f|1
Paracuru|paracuru||BR|ca|gcs|-q8b|-8d8g|ne:j64guj|1
Paragominas|paragominas||BR|1ck|1hpp|-mu4|-a6fo|ne:j64goh|1
Paragould|paragould||US|49|i3e|7q7v|-jebp|ne:j641nb|1
Paraguarí|paraguari||PY|1cf|ekh|-5hoo|-c91s|ne:j644yj|1
Paraíso|paraiso||MX|1of|idy|3xz4|-jzd8|ne:j645wl|1
Parakou|parakou||BJ|95|41px|202g|k7s|ne:j64m4n|1
Paramaribo|paramaribo||SR|1cg|5g49|190u|-bto6|ne:j64mbp|1
Paraná|parana||AR|in|5mdz|-6sut|-cz2t|ne:j647yb|1
Paranaguá|paranagua||BR|1ch|30t1|-5gz3|-aeht|ne:j647az|1
Paranaíba|paranaiba||BR|137|oux|-47uk|-az28|ne:j64gph|1
Paraparaumu|paraparaumu||NZ|1v0|jhr|-8rm2|11iat|ne:j64n6j|1
Parbhani|parbhani||IN|11a|83x2|44ow|gga8|ne:j64fkp|1
Pardubice|pardubice||CZ|wf|2am0|aq44|3dls|ne:j64env|1
Parepare|parepare||ID|1nh|1vq8|-uzr|pn3h|ne:j64lqb|1
Parintins|parintins||BR|2q|1dpo|-k50|-c5t4|ne:j64kw5|1
Paris|paris||FR|1xt|5w9z4|ah2m|hzm|ne:j64n3x|1
Parkersburg|parkersburg||US|1vb|1bsf|8ezf|-hhc0|ne:j6430t|1
Parkes|parkes||AU|17q|8ld|-73mo|vrac|ne:j64ic3|1
Parma|parma||IT|il|3k3f|9lrc|27mo|ne:j64dpz|1
Parnaíba|parnaiba||BR|1do|2yhk|-mgc|-8yas|ne:j64kxt|1
Pärnu|parnu||EE|1f9|y3k|cif7|595c|ne:j64kpv|1
Paro|paro||BT|1q9|bko|5vna|j5y0|ne:j63zm3|1
Parowan|parowan||US|1sv|1zf|83zt|-o6kw|ne:j648md|1
Parras|parras|parras de la fuente|MX|eb|ovx|5g58|-lwfb|ne:j64cu3|1
Parry Sound|parry sound||CA|1av|5hd|9psp|-h5je|ne:j64h4f|1
Partizansk|partizansk||RU|1eq|ws9|98tx|sj9x|ne:j645ot|1
Pasadena|pasadena||US|1q4|dgy4|6cv5|-ke5x|ne:j6424t|1
Pasadena|pasadena||US|bd|33l6|7bl0|-pbkd|ne:j648gf|1
Pasay City|pasay city|pasay|PH|13s|8n08|349s|pxn4|ne:j64ckx|1
Paso de los Toros|paso de los toros||UY|1oj|a79|-715w|-c418|ne:j640zp|1
Paso Río Mayo|paso rio mayo|rio mayo|AR|dx|1ep|-9shu|-f26i|ne:j647p7|1
Paso Robles|paso robles||US|bd|kyd|7mwa|-pv90|ne:j641e3|1
Passau|passau||DE|7k|130g|aet7|2vpo|ne:j64i2x|0
Passo Fundo|passo fundo||BR|1gl|3uix|-61z8|-b8h4|ne:j64k0l|1
Passos|passos||BR|141|2474|-4fss|-9zn8|ne:j6477h|1
Pasto|pasto|san juan de pasto|CO|16z|86xo|9d4|-gkaz|ne:j64lqp|1
Pasuruan|pasuruan||ID|r6|apsw|-1mvc|o754|ne:j64e1b|1
Paterson|paterson||US|17o|38o5|8rqo|-fwas|ne:j6433h|1
Pathankot|pathankot||IN|oj|5fz7|6wzz|g89c|ne:j64fgb|1
Pathein|pathein|bassein|MM|5e|52xt|3leg|kb3g|ne:j64ir3|1
Pathum Thani|pathum thani||TH|1co|3b58|305n|ljpx|ne:j649vb|1
Pati|pati||ID|r5|2mqp|-1g0n|nsqz|ne:j64dz7|1
Patiala|patiala||IN|1f3|7214|6hyc|gde2|ne:j64g95|1
Pativilca|pativilca||PE|z0|om9|-2ak4|-gob4|ne:j64b33|1
Patna|patna||IN|88|1a94g|5hql|i8up|ne:j64myt|1
Patos|patos||BR|1ci|1zfj|-1i5w|-7zqc|ne:j64gxb|1
Patra|patra|patras|GR|hs|3i1s|86zg|4no4|ne:j64jr3|1
Pattani|pattani||TH|1cp|37qo|1gyo|lp90|ne:j63v81|1
Paulatuk|paulatuk||CA|19k|86|evd5|-qknt|ne:j647jt|1
Paulo Afonso|paulo afonso||BR|60|1tuu|-1zzv|-879d|ne:j647et|1
Pavlodar|pavlodar||KZ|1cq|71uy|b7js|ghr0|ne:j64lyd|1
Paysandú|paysandu||UY|1cs|1oyw|-6xgk|-cg5c|ne:j64jt3|1
Peace River|peace river||CA|29|44c|c1wd|-p4yp|ne:j64m1n|1
Pec|pec|peje|XK|1xv|2957|9563|4cpv|ne:j64b7z|1
Pechora|pechora||RU|vt|zkx|dyrn|c9fb|ne:j64kfd|1
Pecos|pecos||US|1q4|6gk|6qem|-m6lz|ne:j648uz|1
Pécs|pecs||HU|6v|3zpy|9vk4|3wl4|ne:j64amt|1
Pedernales|pedernales||DO|1cu|8jk|3v6k|-fdk2|ne:j63xqh|1
Pedreiras|pedreiras||BR|12a|aiu|-z9c|-9koc|ne:j64gm7|1
Pedro Juan Caballero|pedro juan caballero||PY|2l|27b7|-4tye|-by8w|ne:j64b4j|1
Pedro Luro|pedro luro||AR|e6|5h8|-8gnl|-dfo1|ne:j647tj|1
Pekanbaru|pekanbaru|pekan baru|ID|1gh|h4ig|4dh|lql3|ne:j64kj1|1
Pelotas|pelotas||BR|1gl|6vfm|-6szg|-b7s4|ne:j64m0v|1
Pematangsiantar|pematangsiantar||ID|1nn|7b9s|mum|l8d3|ne:j64kiz|1
Pemba|pemba||MZ|b5|2ddf|-2s6e|8oqz|ne:j64lgv|1
Pembroke|pembroke||CA|1fv|bzz|9ts7|-gj1a|ne:j64h6b|1
Penápolis|penapolis||BR|1o6|1619|-4l78|-aqf4|ne:j6480n|1
Pendleton|pendleton||US|1b3|cyn|9seu|-pgkj|ne:j648lf|1
Penedo|penedo||BR|24|whd|-278o|-7u94|ne:j64gvj|1
Penola|penola||AU|1m5|162|-80g6|u6jr|ne:j64if5|1
Penonome|penonome||PA|ee|m72|1tnw|-h828|ne:j6457v|1
Pensacola|pensacola||US|jp|50uo|6iqb|-ioyx|ne:j64izd|1
Penticton|penticton||CA|9t|t3t|aly4|-pmpl|ne:j64h0z|1
Penza|penza||RU|1cz|aziy|bec8|9n80|ne:j64lin|1
Penzance|penzance||GB|f1|g24|aqu1|-16to|ne:j64ad5|1
Peoria|peoria||US|pu|3oyc|8q1k|-j7wc|ne:j64jvv|1
Perabumulih|perabumulih|prabumulih|ID|1nm|27u6|-qkg|mc97|ne:j64e0f|1
Peregrebnoye|peregrebnoye||RU|uq|a|dhuu|dy7f|ne:j64ce5|1
Pereira|pereira||CO|1gn|c6um|1148|-g7y8|ne:j64e8l|1
Pergamino|pergamino||AR|e6|1vms|-79kk|-czd0|ne:j64hex|1
Perito Moreno|perito moreno||AR|1j8|2wm|-9zkg|-f7bq|ne:j64l1x|1
Perm|perm||RU|1d3|ldag|cfjn|c20g|ne:j64mgn|1
Përmet|permet||AL|l8|88u|8mg4|4d1c|ne:j63yv1|1
Pernik|pernik||BG|1d5|1rmr|94s4|4xn7|ne:j6486z|1
Perpignan|perpignan||FR|y7|354s|95h4|mdk|ne:j646tn|1
Perryville|perryville||US|26|35|bzgy|-y40n|ne:j643mb|1
Perth|perth||AU|1ve|wu3k|-6ujv|ott9|ne:j64n03|1
Perth|perth||GB|1d6|uli|c36r|-qrw|ne:j64abv|1
Perugia|perugia||IT|1sf|372d|98n4|2nlo|ne:j64dt3|1
Pervouralsk|pervouralsk||RU|1nz|2v34|c74c|cum6|ne:j64kff|1
Pescara|pescara||IT|5|6qw5|93l6|31pn|ne:j64dsl|1
Peshawar|peshawar||PK|165|rxeg|7aee|fbyb|ne:j64md7|1
Peshkopi|peshkopi||AL|gm|bgg|8xmp|4dnx|ne:j63yw3|1
Petatlán|petatlan||MX|mm|ome|3r6s|-lpek|ne:j64d1j|1
Peter I Island|peter i island||AQ||1|-eqts|-jeya|ne:j64iv1|1
Peterborough|peterborough||GB|1d8|304t|b9po|-1xg|ne:j64aj5|1
Peterborough|peterborough||CA|1av|1siz|9htk|-gsf9|ne:j647kl|1
Peterborough|peterborough||AU|1m5|1ax|-72da|tr8t|ne:j64ief|1
Petersburg|petersburg||US|1u5|2jht|7z92|-gl8m|ne:j642xh|1
Peto|peto||MX|1wg|dl3|4bbo|-j240|ne:j64607|1
Petoskey|petoskey||US|13u|9rv|9q3u|-i7io|ne:j649bv|1
Petrolina|petrolina||BR|1d4|5ldl|-20dk|-8oks|ne:j64m3t|1
Petropavlovsk|petropavlovsk|petropavl|KZ|192|4w3y|brgg|eu3s|ne:j64jsb|1
Petropavlovsk-Kamchatsky|petropavlovsk kamchatsky|petropavlovsk kamchatskiy|RU|sq|40ia|bdfg|xzxy|ne:j64mh7|1
Petrópolis|petropolis||BR|1gm|64qf|-4ton|-99c0|ne:j64gxj|1
Petrovsk Zabaykalskiy|petrovsk zabaykalskiy|petrovsk zabaykalsky|RU|dn|g49|azp7|nbrb|ne:j645of|1
Petrozavodsk|petrozavodsk||RU|td|5oht|d98k|7ci8|ne:j64li7|1
Pevek|pevek||RU|dy|3qd|extc|10i59|ne:j64j5t|1
Phan Rang|phan rang|phan rang thap cham|VN|18c|3upp|2h92|ncx5|ne:j649zn|1
Phan Thiet|phan thiet||VN|aw|77wu|2cd5|n63t|ne:j64a0j|1
Phangnga|phangnga|phang nga|TH|1da|7gs|1t7i|l4ak|ne:j63uuj|1
Phatthalung|phatthalung||TH|1db|xky|1mra|lg8a|ne:j63uwf|1
Phayao|phayao||TH|1dc|g8y|43x7|lewb|ne:j649tt|1
Phetchabun|phetchabun||TH|1dd|1334|3iou|lojq|ne:j63uyv|1
Phetchaburi|phetchaburi|phet buri|TH|1de|1xtt|2t6l|lf5g|ne:j649vt|1
Phichit|phichit||TH|1df|rlc|3iue|liaq|ne:j63uyj|1
Philadelphia|philadelphia||US|1cy|39pnk|8knn|-g413|ne:j64mtn|1
Phitsanulok|phitsanulok||TH|1dg|3ik1|3luj|lhpl|ne:j649u1|1
Phnom Penh|phnom penh|phnum penh|KH|1dh|vf68|2h4w|mhiz|ne:j64mqf|1
Phnum Tbeng Meanchey|phnum tbeng meanchey|phnom tbeng meanchey|KH|1em|it8|2ylz|mhxf|ne:j63zd7|1
Phoenix|phoenix|phoenix mesa|US|48|243yw|76t7|-o0r3|ne:j64mt5|1
Phongsali|phongsali||LA|1dl|4mo|4nb5|lvt4|ne:j63y9f|1
Phonsavan|phonsavan|xiangkhoang|LA|1vr|sxv|463b|m49k|ne:j64dhj|1
Phrae|phrae||TH|1dj|tqi|3w2l|lgv1|ne:j649tx|1
Phuket|phuket||TH|1dk|319u|1orx|l347|ne:j64jyp|1
Phyarpon|phyarpon|pyapon|MM|5e|1em9|3hpx|kial|ne:j64iqp|1
Piatra-Neamt|piatra neamt||RO|178|278g|a26w|5nkm|ne:j63usb|1
Pichilemu|pichilemu||CL|yu|8yb|-7da0|-ffk0|ne:j646xj|1
Picos|picos||BR|1do|18d3|-1imo|-8vr4|ne:j64kxv|1
Picton|picton||NZ|11i|29c|-8uit|11apy|ne:j64n7b|1
Piedras Negras|piedras negras||MX|eb|2zqb|65ic|-ljph|ne:j64ctx|1
Pierre|pierre||US|1m9|apj|9icj|-lib6|ne:j64m91|1
Pietermaritzburg|pietermaritzburg|pietermaritzburg ulundi|ZA|wt|g3ct|-6ch0|6iho|ne:j64kcz|1
Piggs Peak|piggs peak||SZ|oe|4fq|-5kbe|6p3q|ne:j63v8l|1
Pijijiapan|pijijiapan||MX|da|i9n|3d2g|-jzag|ne:j64d2x|1
Pilar|pilar||PY|1cv|lxv|-5rbr|-chug|ne:j64b4d|1
Pilibhit|pilibhit||IN|1sy|2t34|64zk|h3tg|ne:j6472d|1
Pilot Point|pilot point||US|26|1w|cc66|-xrt7|ne:j649it|1
Pimenta Bueno|pimenta bueno||BR|1gy|jvm|-2htc|-d4as|ne:j64755|1
Pimentel|pimentel||PE|y1|c00|-1gp4|-h4qs|ne:j64ayn|1
Pinar del Rio|pinar del rio||CU|1ds|40a6|4sz3|-hxth|ne:j64jhj|1
Piñas|pinas||EC|ie|d3p|-sbg|-h2l0|ne:j646ad|1
Pindamonhangaba|pindamonhangaba||BR|1o6|2u0q|-4wuo|-9quk|ne:j647yt|1
Pine Bluff|pine bluff||US|49|1529|7c3z|-jpwf|ne:j648nl|1
Pine Creek|pine creek||AU|19i|ih|-2ylu|s93r|ne:j64i6n|1
Pingdingshan|pingdingshan|pingdingshan henan|CN|o6|i73c|78a4|oa7p|ne:j64jld|1
Pingdu|pingdu||CN|1ke|1y9x|7vvk|ppgo|ne:j64evf|1
Pingliang|pingliang||CN|kg|4fx4|7m5k|mv5d|ne:j64dun|1
Pingtung|pingtung|pingtung city|TW|1dt|asiy|4v0h|ptn5|ne:j64iwz|1
Pingxiang|pingxiang|pingxiang jiangxi|CN|rf|klig|5x4s|oegh|ne:j64mjv|1
Pingxiang|pingxiang||CN|mf|o05|4qi6|mvqn|ne:j64dvf|1
Pingyi|pingyi||CN|1ke|1odq|7m00|p7k8|ne:j64evb|1
Pingzhen|pingzhen||TW|1p7|4bkw|5cgv|pzb5|ne:j640uz|1
Pinheiro|pinheiro||BR|12b|u0d|-jfw|-9nx0|ne:j64gmp|1
Pinrang|pinrang||ID|1nh|3wzv|-t7l|pn8q|ne:j64e2n|1
Pinsk|pinsk||BY|9p|2swp|b67z|5lcd|ne:j64i3b|1
Piracicaba|piracicaba||BR|1o6|7c1t|-4v8c|-a7lc|ne:j64805|1
Piraeus|piraeus|piraievs|GR|54|9zm9|84to|52vc|ne:j646yl|1
Pirapora|pirapora||BR|141|1af8|-3ppw|-9mok|ne:j64k0f|1
Pirassununga|pirassununga||BR|1o6|1am5|-4poc|-a5z0|ne:j647zx|1
Pires do Rio|pires do rio||BR|le|j5i|-3phf|-acj4|ne:j64hcp|1
Pirgos|pirgos|pyrgos|GR|hs|ha7|82rp|4lic|ne:j64fud|1
Piripiri|piripiri||BR|1do|ym8|-wy0|-8ygc|ne:j64gvf|1
Pisa|pisa||IT|1r5|4cw8|9dcl|288w|ne:j64dqp|1
Pisco|pisco||PE|po|1qnr|-2xsc|-gc48|ne:j64k9p|1
Piso Firme|piso firme||BO|1j8|20|-2xku|-d9d6|ne:j64hwb|1
Pita|pita||GN|11n|fh0|2dhs|-2noq|ne:j63yed|1
Pitești|pitesti||RO|45|3nyl|9m43|5bxy|ne:j64ay5|1
Pittsburgh|pittsburgh||US|1cy|13e7k|8nz3|-h5ar|ne:j64m9v|1
Pittsfield|pittsfield||US|12y|zo6|93j6|-fp9y|ne:j642ah|1
Piura|piura||PE|1dv|8i9w|-1478|-ha58|ne:j64lev|1
Pizen|pizen|plzen|CZ|tf|3iok|anss|2v34|ne:j64emh|1
Placetas|placetas||CU|1u1|16r4|4s6u|-h2mj|ne:j646f7|1
Plast|plast||RU|d2|d5m|bnid|d179|ne:j645hh|1
Plattsburgh|plattsburgh||US|17s|mk6|9kva|-fqt0|ne:j6434l|1
Play Ku|play ku|play cu,pleiku|VN|l1|329g|2zw9|n5c0|ne:j64jyt|1
Pleven|pleven||BG|1dy|2jkj|9b26|59x2|ne:j64i1t|1
Ploiești|ploiesti||RO|1el|4zfi|9mt9|5kwd|ne:j64ayf|1
Plovdiv|plovdiv||BG|1dz|7aq6|919g|5b04|ne:j6486v|1
Plumtree|plumtree||ZW|131|1no|-4e0r|5yns|ne:j64a5d|1
Plymouth|plymouth||GB|1e0|5atd|asry|-w3k|ne:j64adt|1
Pô|po||BF|16a|dtw|2e6i|-8ra|ne:j63zz1|1
Pocatello|pocatello||US|pq|1ddq|96sp|-o3mn|ne:j64ixb|1
Pochutla|pochutla|san pedro pochutla|MX|1a6|iw1|3ddk|-kod8|ne:j64czx|1
Poços de Caldas|pocos de caldas||BR|141|353w|-4o20|-9zc4|ne:j6476z|1
Podgorica|podgorica||ME|1e1|34je|93o4|44nr|ne:j64lhj|1
Podkamennaya Tunguska|podkamennaya tunguska|podkamennaya|RU|wc|a|d7az|jbec|ne:j64cnn|1
Podolsk|podolsk||RU|155|6vej|bvbg|81kz|ne:j64c1p|1
Poffader|poffader|pofadder|ZA|19f|398|-68sh|45ka|ne:j64bi7|1
Pogradec|pogradec||AL|w0|uv4|8rl4|4fg0|ne:j63yrj|1
Pohang|pohang||KR|fr|9buq|7pxt|rq8j|ne:j64j8j|1
Point Hope|point hope||US|26|ct|endh|-zr3k|ne:j64mab|1
Pointe-à-Pitre|pointe a pitre||GP|m9|349z|3hbj|-d6si|ne:j64gll|1
Pointe-Noire|pointe noire||CG|w6|e4jw|-10t0|2jo0|ne:j64lzv|1
Poitier|poitier|poitiers|FR|1e3|1ubs|9zft|2kl|ne:j646t1|1
Pokhara|pokhara||NP|lk|4abk|6234|hzxk|ne:j64isb|1
Pokrovsk|pokrovsk||RU|1hy|7j7|d6hi|rocp|ne:j64cq1|1
Pol-e Khomri|pol e khomri|pul e khomri|AF|5y|17ht|7pef|eq3n|ne:j6484b|1
Polatlı|polatli||TR|37|1zym|8hfm|6w1s|ne:j644mj|1
Polatsk|polatsk|polotsk|BY|1u7|1rgy|bw5q|6644|ne:j6487l|1
Polevskoy|polevskoy||RU|1nz|1eqy|c3iq|cwew|ne:j64c9x|1
Polokwane|polokwane|pietersburg polokwane|ZA|z5|4psd|-54c4|6b8k|ne:j64kcp|1
Polson|polson||US|14o|43y|a7yo|-ogu7|ne:j64187|1
Poltava|poltava||UA|1e4|6t93|amik|7eqv|ne:j649ph|1
Polyarnyy|polyarnyy|polyarny|RU|15q|etc|etzo|763q|ne:j645av|1
Polygyros|polygyros||GR|ue|422|8nky|50yq|ne:j63y1p|1
Ponca City|ponca city||US|1ao|ji1|7v8i|-kt45|ne:j648rb|1
Ponce|ponce||PR||3fpq|3uw4|-ea0m|ne:j64isn|1
Pond Inlet|pond inlet||CA|19z|171|fkua|-gpup|ne:j64kzl|1
Ponta Delgada|ponta delgada||PT|5g|1bh2|839n|-5i1m|ne:j64lfb|1
Ponta Grossa|ponta grossa||BR|1ch|69g1|-5dlg|-ar1c|ne:j64m0z|1
Ponta Porã|ponta pora||BR|137|20sb|-4tuc|-by0k|ne:j6475b|0
Ponte Nova|ponte nova||BR|141|116j|-4dhc|-970n|ne:j64gqj|1
Pontes e Lacerda|pontes e lacerda||BR|136|mo5|-39fo|-cpy4|ne:j64grj|1
Pontiac|pontiac||US|13u|1ggq|953r|-huo6|ne:j649bh|1
Pontianak|pontianak||ID|si|d0lr|-8c|nfio|ne:j64km5|1
Popayán|popayan||CO|c7|5jni|io8|-gf4k|ne:j64jhx|1
Poplar Bluff|poplar bluff||US|14a|fxy|7vn6|-jdjv|ne:j648pn|1
Popondetta|popondetta||PG|19d|lra|-1vnw|vrw4|ne:j64bq5|1
Porbandar|porbandar||IN|fq|5130|4n7g|exks|ne:j64jt1|1
Pori|pori||FI|1jp|1n8k|d6dh|4o0l|ne:j646zp|1
Porirua|porirua||NZ|1v0|14ic|-8tar|11h64|ne:j64n6l|1
Porlamar|porlamar||VE|19v|47ye|2ckk|-doo4|ne:j649a3|1
Poronaysk|poronaysk||RU|1hz|cv9|ajy8|uo1u|ne:j64csd|1
Port Alfred|port alfred||ZA|i3|duv|-7797|5reo|ne:j64buf|1
Port Antonio|port antonio||JM|1eb|b40|3w46|-gdco|ne:j63x1t|1
Port Arthur|port arthur||US|1q4|17xt|6epa|-k4ra|ne:j648td|1
Port-au-Prince|port au prince||HT|1br|16to0|3z2u|-fi5w|ne:j64mbh|1
Port Augusta|port augusta||AU|1m5|aq1|-6yp0|tj1g|ne:j64k5t|1
Port Blair|port blair||IN|32|2qfe|2i0u|jvk0|ne:j64fkz|1
Port Burwell|port burwell||CA|17t|24q|cx0p|-dvjn|ne:j64l1p|1
Port Charlotte|port charlotte||US|jp|1dlj|5sc0|-hlj5|ne:j642ex|1
Port-De-Paix|port de paix||HT|18p|qqp|49sm|-flyf|ne:j63tkj|1
Port Denison|port denison||AU|1ve|xp|-69y4|ompa|ne:j64i85|1
Port Douglas|port douglas||AU|1fn|2bc|-3j72|v6d7|ne:j64in5|1
Port Elizabeth|port elizabeth||ZA|i3|lvt4|-7a3l|5hil|ne:j64me1|1
Port-Gentil|port gentil||GA|1af|2i5g|-5k0|1vqw|ne:j64mkn|1
Port Harcourt|port harcourt||NG|1gr|lv1c|114n|1i2p|ne:j64lml|1
Port Hardy|port hardy||CA|9t|1rr|avc3|-rbso|ne:j64h0d|1
Port Hedland|port hedland||AU|1ve|b0w|-4cps|pf64|ne:j64m5j|1
Port Heiden|port heiden||US|26|2u|c7f7|-xzz1|ne:j643lv|1
Port Hope Simpson|port hope simpson||CA|17t|5h|b9cl|-c2ew|ne:j647oh|1
Port Lavaca|port lavaca||US|1q4|927|64sw|-kpll|ne:j648uh|1
Port Lincoln|port lincoln||AU|1m5|aim|-7g04|t4cq|ne:j64m61|1
Port Louis|port louis||MU||crhf|-4blu|cbo8|ne:j64m7f|1
Port Macquarie|port macquarie||AU|17q|11gj|-6qmq|wrxf|ne:j64k57|1
Port Maria|port maria||JM|1ht|63m|3xsq|-ghd4|ne:j63x2n|1
Port-Menier|port menier||CA|1fv|7b|aofm|-dsig|ne:j647lj|1
Port Morant|port morant||JM|1hv|8wg|3u1q|-gcyi|ne:j63x3l|1
Port Moresby|port moresby||PG|cd|62xh|-2113|vjqt|ne:j64mdj|1
Port-of-Spain|port of spain||TT|1e9|6bkm|2a6w|-d6o2|ne:j64lbv|1
Port Pirie|port pirie||AU|1m5|9ne|-743r|tkqk|ne:j64ig5|1
Port Shepstone|port shepstone||ZA|wt|14qh|-6l17|6j14|ne:j64bnp|1
Port St. Johns|port st johns||ZA|i3|4kz|-6s1j|6bub|ne:j64bun|1
Port Sudan|port sudan||SD|1ga|ahvh|47cu|7z5w|ne:j64mbz|1
Port Vila|port vila||VU|1kj|xzc|-3sty|102qm|ne:j64mb7|1
Portachuelo|portachuelo||BO|1j8|8v1|-3py8|-dl74|ne:j6485x|1
Portalegre|portalegre||PT|1ea|c0t|8f5w|-1l9y|ne:j63vfl|1
Portel|portel||BR|1ck|gg3|-f1o|-aw4o|ne:j6474x|1
Portimão|portimao||PT|jc|1b8q|7yix|-1tud|ne:j64b5t|1
Portland|portland||US|1b3|146rc|9r90|-qamb|ne:j64m8n|1
Portland|portland||US|11d|2wu2|9cz6|-f20n|ne:j64jx5|1
Portland|portland||AU|1tx|940|-87u0|ucik|ne:j64m65|1
Porto|porto||PT|1ec|snmw|8tj4|-1uiz|ne:j64j3x|1
Porto Alegre|porto alegre||BR|1gl|2bydk|-6fup|-az2s|ne:j64mzb|1
Porto Nacional|porto nacional||BR|1qs|71l|-2ak8|-adlz|ne:j64k07|1
Porto-Novo|porto novo||BJ|1bv|6fhc|1e0x|k6u|ne:j64m4p|1
Porto Santana|porto santana||BR|2o|1srb|-b0|-aywo|ne:j64h2n|1
Porto Seguro|porto seguro||BR|60|2n1h|-3irs|-8djk|ne:j64gw1|1
Porto União|porto uniao||BR|1j7|1j8a|-5mgs|-ay4w|ne:j64gtp|1
Porto Velho|porto velho||BR|1gy|6k90|-1vik|-dp20|ne:j64m0b|1
Portoviejo|portoviejo||EC|11o|4ktd|-86g|-h8u0|ne:j64jhb|1
Portsmouth|portsmouth||GB|1ed|9h8s|avz7|-8c0|ne:j64aj1|1
Porvoo|porvoo||FI|i6|9g2|cy1w|5i1g|ne:j64fzx|1
Posadas|posadas||AR|147|7njz|-5v3e|-bz7n|ne:j64mpv|0
Poso|poso|poso kota|ID|1ni|10cm|-aq0|pvsg|ne:j64dnx|1
Potchefstroom|potchefstroom||ZA|198|2nf9|-5q0k|5t3s|ne:j64blj|1
Potenza|potenza||IT|75|1hac|8plg|3dwm|ne:j63wln|1
Poti|poti||GE|1id|10dp|919x|8xjg|ne:j64fw1|1
Potiskum|potiskum||NG|1wa|1ucy|2icw|2dhs|ne:j64dbf|1
Potosí|potosi||BO|1eg|3ut9|-4700|-e3bw|ne:j64hvt|1
Potsdam|potsdam||DE|9l|4oa7|b8bo|2suk|ne:j64eo3|1
Poughkeepsie|poughkeepsie||US|17s|3nxw|8xre|-fudq|ne:j64345|1
Pouso Alegre|pouso alegre||BR|141|2gw1|-4rg8|-9uh4|ne:j64765|1
Powell|powell||US|1vp|5bj|9lcz|-nb6o|ne:j641mv|1
Powell River|powell river||CA|9t|9uz|aowl|-qp18|ne:j64h1d|1
Poza Rica de Hidalgo|poza rica de hidalgo|poza rica|MX|1tm|5gcx|4ekg|-kw30|ne:j64d2b|1
Poznań|poznan||PL|m5|ddh9|b8d6|3mef|ne:j64dfd|1
Pozo Almonte|pozo almonte||CL|1pd|8cu|-4ceg|-eykw|ne:j64fr3|1
Pozo Colorado|pozo colorado||PY|1en|1nb|-50sc|-cm60|ne:j644xn|1
Prachin Buri|prachin buri||TH|1ei|1pjh|30gs|lq88|ne:j649v1|1
Prachuap Khiri Khan|prachuap khiri khan||TH|1ej|pv5|2j2m|le28|ne:j63v2v|1
Prague|prague||CZ|1ek|owls|aqgl|33ls|ne:j64mwv|1
Praia|praia||CV||2fh0|373j|-51gf|ne:j64msl|1
Praya|praya||ID|1a0|r5b|-1vav|oxbf|ne:j64dnj|1
Prescott|prescott||US|48|16gu|7ewc|-o3ni|ne:j64ixh|1
Presidencia Roque Saenz Pena|presidencia roque saenz pena||AR|cm|1r6f|-5qpo|-cyfo|ne:j647wx|1
Presidente Dutra|presidente dutra||BR|12b|nei|-14ic|-9jio|ne:j64741|1
Presidente Prudente|presidente prudente||BR|1o6|4hni|-4qog|-b0j0|ne:j6480t|1
Prešov|presov||SK|1ep|2132|ai31|4jvu|ne:j64bcj|1
Presque Isle|presque isle||US|11d|7ay|a126|-ekpi|ne:j649ap|1
Pretoria|pretoria||ZA|kk|soeo|-5ica|61sz|ne:j64mdh|1
Prey Veng|prey veng||KH|1eo|1l3k|2gm0|mkoo|ne:j63zcv|1
Price|price||US|1sv|7xl|8hjy|-nr0k|ne:j648mt|1
Prieska|prieska||ZA|19f|8o4|-6cur|4vdw|ne:j64bih|1
Prijedor|prijedor||BA|1k4|28wq|9n2k|3kuw|ne:j64iot|1
Prince Albert|prince albert||CA|1jo|qpd|behs|-mnz0|ne:j64k1j|1
Prince George|prince george||CA|9t|1el2|bk0v|-qb9v|ne:j64kzh|1
Prince Rupert|prince rupert||CA|9t|bck|bn3z|-rxms|ne:j64mnx|1
Principe da Beira|principe da beira||BR|1gx|qk|-2nt3|-dt1i|ne:j64kwv|0
Pristina|pristina||XK|1eu|9yxu|957v|4jbg|ne:j64lod|1
Prizren|prizren||XK|1ev|3oaw|91ud|4g3x|ne:j6458f|1
Probolinggo|probolinggo||ID|r6|3w60|-1nso|o92k|ne:j64e15|1
Proddatur|proddatur||IN|33|48cr|35tc|gu90|ne:j64fhl|1
Progreso|progreso||MX|1wg|10d0|4k81|-j7ve|ne:j64jep|1
Progress|progress||RU|2t|42|anvk|rs4n|ne:j64cot|1
Prokopyevsk|prokopyevsk||RU|uc|5wnz|bjw8|il24|ne:j64j87|1
Proserpine|proserpine||AU|1fn|32g|-4dj6|vuh7|ne:j64ij1|1
Providence|providence||US|1gf|rdc8|8ypi|-fb21|ne:j64iz5|1
Provideniya|provideniya||RU|dy|1yg|dt3f|-114ma|ne:j64kdt|1
Provo|provo||US|1sv|7n8o|8mk9|-nxei|ne:j64iy3|1
Prudhoe Bay|prudhoe bay||US|26|1xg|f2dm|-vv52|ne:j64man|1
Pskov|pskov||RU|1ex|4buu|ce7w|62lf|ne:j64li1|1
Puca Urco|puca urco||PE|zn|a|-i00|-fewv|ne:j64b1l|1
Pucallpa|pucallpa||PE|1s9|6nry|-1skp|-fz46|ne:j64lf1|1
Puducherry|puducherry|pondicherry|IN|1ey|4vgz|2k3a|h3z0|ne:j64lzn|1
Puebla|puebla|puebla city|MX|1ez|1b1o8|4307|-l1qc|ne:j64mv3|1
Pueblo|pueblo||US|ek|2ekj|87dg|-mfbw|ne:j648iz|1
Puerto Acosta|puerto acosta||BO|xi|v7|-3blg|-etoz|ne:j64huv|1
Puerto Aisén|puerto aisen||CL|v|683|-9qb3|-fkyg|ne:j64jq7|1
Puerto Armuelles|puerto armuelles||PA|dl|ky3|1rw0|-hrfg|ne:j64kd7|1
Puerto Ayacucho|puerto ayacucho||VE|2q|14j2|17pb|-ehsc|ne:j64lbt|0
Puerto Baquerizo Moreno|puerto baquerizo moreno|baquerizo moreno|EC|ke|4ni|-6y0|-j7cw|ne:j646al|1
Puerto Barrios|puerto barrios||GT|qt|17od|3d9z|-izl3|ne:j64joz|1
Puerto Berrío|puerto berrio||CO|3c|q7z|1e04|-fy88|ne:j64e4t|1
Puerto Cabello|puerto cabello||VE|bv|3q9c|28sg|-em04|ne:j648w5|1
Puerto Carreño|puerto carreno||CO|1tw|7vs|1bq2|-egs2|ne:j64ebv|0
Puerto Deseado|puerto deseado||AR|1j8|2jt|-a8fw|-e4hk|ne:j64mpb|1
Puerto Escondido|puerto escondido||MX|1a6|f1c|3edc|-ksyr|ne:j64czt|1
Puerto Heath|puerto heath||BO|xi|a|-2og4|-epu2|ne:j64hul|1
Puerto la Cruz|puerto la cruz||VE|3i|bprs|26h0|-dv2o|ne:j6436v|1
Puerto Lempira|puerto lempira||HN|lr|3qw|39rg|-hydw|ne:j64a6x|1
Puerto López|puerto lopez||CO|13r|cva|vk4|-fmyo|ne:j646ep|1
Puerto Madryn|puerto madryn||AR|dx|1dt7|-960k|-dxuo|ne:j647pl|1
Puerto Maldonado|puerto maldonado||PE|10v|1ftf|-2p80|-ettl|ne:j64k91|1
Puerto Montt|puerto montt||CL|zq|3qqt|-8vzg|-fmqc|ne:j64ml5|1
Puerto Natales|puerto natales||CL|113|ffk|-b327|-fji5|ne:j64jqb|1
Puerto Pinasco|puerto pinasco||PY|1en|dw|-4uow|-cdws|ne:j644xh|1
Puerto Plata|puerto plata||DO|1f0|2kih|48pa|-f5g6|ne:j63xnh|1
Puerto Princesa|puerto princesa||PH|1c5|3d94|239j|pg8k|ne:j64kgj|1
Puerto Quijarro|puerto quijarro||BO|1j8|80o|-3t6s|-cdr8|ne:j64hwj|1
Puerto San Julián|puerto san julian||AR|1j8|1t7|-akeg|-eii7|ne:j64l1v|1
Puerto Suárez|puerto suarez||BO|1j8|gz4|-427s|-cedg|ne:j64hxb|1
Puerto Vallarta|puerto vallarta||MX|qz|40e6|4fjn|-mk2q|ne:j64cxz|1
Puerto Varas|puerto varas||CL|zq|j9a|-8uwk|-fn70|ne:j646xt|1
Puerto Villamil|puerto villamil||EC|k8|1p4|-779|-jiaf|ne:j646ah|1
Puerto Villarroel|puerto villarroel||BO|ed|1de|-3m64|-dvug|ne:j647qp|1
Puerto Williams|puerto williams||CL|112|1xg|-brv9|-ehqf|ne:j64jqd|1
Pugachev|pugachev|pugachyov|RU|1jk|kle|b5ck|agi0|ne:j64cd1|1
Pukatawagan|pukatawagan||CA|121|bz|by1h|-lpri|ne:j647gz|1
Pukë|puke||AL|1kr|50f|90bx|49f5|ne:j63yp3|1
Pukekohe|pukekohe||NZ|56|kak|-7z1r|11hk9|ne:j64n6p|1
Pula|pula||HR|qn|1bj3|9m7j|2yup|ne:j64en7|1
Punakha|punakha||BT|1f2|3uw|5wua|j9e9|ne:j63zml|1
Punata|punata||BO|ed|kb7|-3rf0|-e40w|ne:j647qd|1
Pune|pune|poona|IN|11a|2s4xs|3yzs|fttd|ne:j64myb|1
Puno|puno||PE|be|2hxk|-3e61|-f0dp|ne:j64azp|1
Punta Alta|punta alta||AR|e6|1855|-8c00|-db0g|ne:j647sd|1
Punta Arenas|punta arenas||CL|113|2ily|-be82|-f7dk|ne:j64mkt|1
Punta del Este|punta del este|maldonado|UY|11j|3eoo|-7htw|-brzw|ne:j6412z|1
Punta Gorda|punta gorda||BZ|1qy|5z8|3g8b|-j19g|ne:j64hl5|1
Punta Prieta|punta prieta||MX|62|en|6795|-ogwy|ne:j64ctj|1
Puntarenas|puntarenas||CR|1f4|1826|24xi|-i6kw|ne:j64e6h|1
Punto Fijo|punto fijo||VE|j9|514g|2ifk|-f1qs|ne:j64juz|1
Puqi|puqi||CN|p6|4eb0|6dbo|oepc|ne:j64er3|1
Puquio|puquio||PE|5c|83f|-35fc|-fvzo|ne:j644vf|1
Puri|puri||IN|1b9|4b42|48xo|iet4|ne:j64fjd|1
Purnia|purnia||IN|88|494l|5iym|ir00|ne:j64gd3|1
Pursat|pursat|pouthisat|KH|1eh|14ho|2opl|m9tr|ne:j64hqj|1
Put Lenina|put lenina||RU|1hy|8a|eooe|n3sg|ne:j645pj|1
Putian|putian||CN|jy|82jy|5g7z|pid4|ne:j64dwn|1
Putina|putina||PE|be|69i|-3bd8|-evq4|ne:j644u3|1
Putrajaya|putrajaya||MY|1jy|1gfw|mhg|lsqj|ne:j64lrv|1
Puttalan|puttalan|puttalam|LK|1f5|z8d|1pze|h3xw|ne:j63w3v|1
Puyang|puyang||CN|o6|ea4y|7ngs|on6w|ne:j64etx|1
Puyo|puyo||EC|1cn|j75|-bfy|-gpr2|ne:j640jd|1
Puzi|puzi||TW|db|12kw|510z|prsj|ne:j648ab|1
Pyatigorsk|pyatigorsk||RU|1mx|328h|9g4g|98hg|ne:j6459l|1
Pyay|pyay||MM|5z|2wek|416t|kenm|ne:j64k7l|1
Pyongsan|pyongsan|pyongyang|KP|pd|1f4k|87t3|r37e|ne:j64di1|1
Pyongyang|pyongyang|p yongyang|KP|1c1|1yqao|8d3a|qybb|ne:j64mvb|1
Pyu|pyu||MM|5z|v5u|3ykr|ko4b|ne:j64k7j|1
Qaanaaq|qaanaaq||GL|1fb|h4|glv7|-euyy|ne:j64lwv|1
Qabala|qabala||AZ|1fa|95n|8s7q|a96i|ne:j63z3f|1
Qacha's Nek|qacha s nek||ZA|i3|jqd|-6gdx|65gs|ne:j63w0p|1
Qairouan|qairouan|kairouan|TN|sf|33ii|7nb8|25xk|ne:j649fj|1
Qal at Bishah|qal at bishah|bisha governorate|SA|1xl|1w4j|4adz|94oz|ne:j64515|1
Qala i Naw|qala i naw|qal eh ye now|AF|5t|2b9|7hxi|dj51|ne:j63z53|1
Qalat|qalat||AF|1wm|9en|6vs3|ec3o|ne:j64hph|1
Qaminis|qaminis||LY|7t|44k|6sam|4afv|ne:j64de7|1
Qapshaghay|qapshaghay|kapchagay|KZ|2e|wjb|9em4|ginz|ne:j64g4j|1
Qaqortoq|qaqortoq||GL|vv|2hk|d0l5|-9v7w|ne:j64jqp|1
Qaraghandy|qaraghandy|karaganda|KZ|1fc|9om0|aowy|fo5q|ne:j64mlz|1
Qaratau|qaratau|karatau|KZ|1x6|t89|997y|f3o8|ne:j64gat|1
Qarazhal|qarazhal|karazhal|KZ|1fc|h3u|aakd|f6an|ne:j64g2n|1
Qardho|qardho||SO|6w|119|21b0|ajd8|ne:j64cip|1
Qarqaraly|qarqaraly|karkaraly|KZ|1fc|6bn|ald5|g6ah|ne:j64js5|1
Qarshi|qarshi|karshi|UZ|tp|8a49|8bxc|e3ps|ne:j649rz|1
Qasigiannguit|qasigiannguit||GL|1fb|119|er0h|-ayw9|ne:j64ftd|1
Qasr-e Shirin|qasr e shirin||IR|uj|8n6|7eas|9roc|ne:j64g81|0
Qasr Farafra|qasr farafra|farafra|EG|1y|3uw|5sun|5zsi|ne:j64ehf|1
Qasserine|qasserine|kasserine|TN|tu|1r9f|7jgc|1w4s|ne:j649f5|1
Qazaly|qazaly|kazaly|KZ|1fw|52u|9t3w|db83|ne:j64ktt|1
Qazvin|qazvin||IR|1fd|9yg7|7rv0|apsw|ne:j64kub|1
Qena|qena||EG|1ff|6h1n|5ls1|70gw|ne:j64ehv|1
Qeqertasuaq|qeqertasuaq|qeqertarsuaq|GL|1fb|a|euai|-bhb8|ne:j64jqx|1
Qingan|qingan|qing an|CN|o5|151y|a1nz|rbvy|ne:j646oj|1
Qingdao|qingdao||CN|1ke|1pff4|7qhj|psgh|ne:j64lst|1
Qinggang|qinggang||CN|o5|1diu|a09g|r0zs|ne:j646o3|1
Qingyuan|qingyuan||CN|me|f5b1|52vg|o859|ne:j64dy7|1
Qinhuangdao|qinhuangdao||CN|o3|lhx4|8k4b|pmz9|ne:j64jkv|1
Qinzhou|qinzhou||CN|mf|59c0|4pdc|na48|ne:j64dvb|1
Qiqihar|qiqihar|qiqihaer|CN|o5|z67c|a5bx|qkp4|ne:j64mjz|1
Qitaihe|qitaihe||CN|o5|9np5|9te8|s1n8|ne:j64jnt|1
Qom|qom||IR|1fg|kurs|7fdk|ax49|ne:j64ku7|1
Qomsheh|qomsheh|shahreza|IR|iu|2ja5|6v03|b45h|ne:j64g4t|1
Qoqon|qoqon|kokand|UZ|ji|7i28|8ot8|f7dk|ne:j649s3|1
Quảng Ngãi|quang ngai||VN|1fk|5cwg|38wg|nbqk|ne:j64a01|1
Quảng Trị|quang tri||VN|1fm|1k42|3l8w|mz5s|ne:j64a05|1
Quanzhou|quanzhou||CN|jy|vcuw|5c58|peyc|ne:j64lpb|1
Quaraí|quarai||BR|1gl|hx9|-6iew|-c3nb|ne:j6478z|1
Quchan|quchan||IR|1g8|34aj|7ycu|cjef|ne:j64g8t|1
Queanbeyan|queanbeyan||AU|58|p5m|-7ksq|vzbl|ne:j64i9f|1
Québec|quebec|quebec city|CA|1fv|ddm9|a1f4|-f9qg|ne:j64mop|1
Queenstown|queenstown||ZA|i3|2999|-6u50|5reo|ne:j64bux|1
Queenstown|queenstown||NZ|1bj|ct4|-9neb|105w3|ne:j64n5v|1
Queenstown|queenstown||AU|1pl|1tc|-90pp|v72k|ne:j64int|1
Quelimane|quelimane||MZ|1wu|41t0|-3tyo|7wn8|ne:j64lhl|1
Quellón|quellon||CL|zq|5f9|-98k4|-frwg|ne:j64ft3|1
Querétaro|queretaro|santiago de queretaro|MX|1fo|klig|4f74|-lijv|ne:j64jej|1
Quesada|quesada||CR|25|o02|27pl|-i3jk|ne:j64e6p|1
Quesnel|quesnel||CA|9t|an0|bctp|-q935|ne:j64h0l|1
Quetta|quetta||PK|6d|gglc|6h6z|ed5i|ne:j64lgf|1
Quetzaltenango|quetzaltenango|quezaltenango|GT|1fp|cbvj|36fg|-jm68|ne:j64luz|1
Quezon City|quezon city||PH|13s|1n6yg|351k|pxvg|ne:j64ckv|1
Qui Nhon|qui nhon||VN|ax|h9d6|2ybs|nefs|ne:j64jyz|1
Quibala|quibala||AO|ff|6vn|-2asg|37l4|ne:j64hrz|1
Quibdó|quibdo||CO|dr|1zl8|17wo|-gfig|ne:j64ead|1
Quiemo|quiemo|qiemo town|CN|1vs|1elg|868q|ibz9|ne:j64ep3|1
Quillacollo|quillacollo||BO|ed|4v70|-3q9c|-e7f4|ne:j647ql|1
Quillota|quillota||CL|1t9|1phi|-71pc|-f9ug|ne:j646vn|1
Quilpie|quilpie||AU|1fn|fk|-5pdi|ux1g|ne:j64k63|1
Quime|quime||BO|xi|34d|-3n0o|-eeo8|ne:j64855|1
Quincy|quincy||US|pu|10ck|8k5c|-jlbl|ne:j6491p|1
Quinhagak|quinhagak||US|26|6y|ct10|-ypcm|ne:j649j3|1
Quipungo|quipungo||AO|p1|56|-36fb|349o|ne:j64htx|1
Quirihue|quirihue||CL|1xz|51d|-7rxs|-fjn8|ne:j646x5|1
Quissico|quissico|zavala|MZ|q7|xm|-5as9|7g98|ne:j64btv|1
Quito|quito||EC|1dq|10gi0|-1n6|-gtq4|ne:j64min|1
Quixadá|quixada||BR|ca|1228|-12ck|-8d2w|ne:j647dz|1
Qulan|qulan|kulan|KZ|1x6|a4o|976c|fkzu|ne:j64gaj|1
Qulsary|qulsary|kulsary|KZ|55|smn|a2ix|bksl|ne:j64ktx|1
Qunghirot|qunghirot|qo ng irot|UZ|t9|18ke|98c0|cmh4|ne:j649rd|1
Qurghonteppa|qurghonteppa|bokhtar|TJ|ut|6oeu|83yd|eqn5|ne:j6446j|1
Qusmuryn|qusmuryn||KZ|1fh|67l|b8ro|dugg|ne:j64g0x|1
Quzhou|quzhou||CN|1x7|7xhs|67jc|ph7g|ne:j64exh|1
Qyzylorda|qyzylorda|kyzylorda,qyzlorda|KZ|1fw|6fhc|9log|e14q|ne:j64ly5|1
Raba|raba||ID|1a0|29v9|-1t78|pgeq|ne:j64lo3|1
Rabat|rabat||MA|1fy|10jl4|7ajh|-1gr0|ne:j64mdt|1
Rabaul|rabaul||PG|i0|68a|-wg7|wly2|ne:j64lh7|1
Rạch Giá|rach gia||VN|vm|6fhc|25a2|miw2|ne:j64a0x|1
Racine|racine||US|1vm|2tl2|95ot|-itk6|ne:j6495t|1
Radisson|radisson||CA|1fv|7i|bizw|-gmw6|ne:j64h6f|1
Rafaela|rafaela||AR|1j9|1wg9|-6p4k|-d6jc|ne:j647yj|1
Rafha|rafha|rafha governorate|SA|1f|1dyr|6cju|9blw|ne:j64b8h|1
Ragusa|ragusa||IT|1kw|1h7g|7wyc|35no|ne:j64681|1
Rahim Yar Khan|rahim yar khan||PK|1f3|7kj7|63ai|f2eg|ne:j6455j|1
Raichur|raichur||IN|th|5gy0|3h2w|gkvi|ne:j64fk7|1
Raipur|raipur||IN|d7|ir5k|4jv5|hhvv|ne:j64lzh|1
Rajahmundry|rajahmundry|rajamahendravaram|IN|33|6j6s|3nen|hj3g|ne:j64fid|1
Rajapalaiyam|rajapalaiyam|rajapalayam|IN|1p2|7xhj|20os|gmm0|ne:j64ged|1
Rajbiraj|rajbiraj||NP|1hm|pid|5oqd|il8l|ne:j63vvd|1
Rajkot|rajkot||IN|fq|r080|4s5s|f6a5|ne:j64l8l|1
Rajshahi|rajshahi||BD|1g0|hd00|583d|iznz|ne:j64m6t|1
Raleigh|raleigh||US|18z|oxrv|7odo|-gutr|ne:j64m9d|1
Ramallah|ramallah||PS||izb|6u5x|7jni|ne:j6407v|1
Ramechhap|ramechhap||NP|r2|bko|5uuk|ig92|ne:j63vud|1
Ramla|ramla||IL|n6|1d9w|6u9r|7h17|ne:j63y3n|1
Rampur|rampur||IN|1sy|6cpu|66ca|gxre|ne:j64gbp|1
Rancagua|rancagua||CL|yu|4zzo|-7bno|-f5u0|ne:j64krb|1
Ranchi|ranchi||IN|rd|mdk0|50c8|iae9|ne:j64lzd|1
Rangpur|rangpur||BD|1g0|64cc|5ios|j4w0|ne:j64k7f|1
Rankin Inlet|rankin inlet||CA|19z|1wo|dgp3|-jqm1|ne:j64l01|1
Ranong|ranong||TH|1g2|iy9|24v8|l53g|ne:j63uv3|1
Raoul Island Station|raoul island station||NZ|1mb|0|-69o1|-124w0|ne:j64n7j|1
Rapid City|rapid city||US|1m9|1ktc|9g4m|-m4j6|ne:j64iyf|1
Ras al Khaymah|ras al khaymah|ra s al khaymah,ras al khaimah|AE|1g4|3g41|5j0b|bzno|ne:j649qd|1
Rashid|rashid|rosetta|EG|sb|49xx|6qr0|6iho|ne:j64ehb|1
Rasht|rasht||IR|l4|cqse|7zt4|amy4|ne:j64kuj|1
Rason|rason|sonbong|KP|nk|1ayo|92oh|ry6z|ne:j64din|1
Ratchaburi|ratchaburi||TH|1g5|2ak4|2whn|le87|ne:j649vz|1
Ratlam|ratlam||IN|10u|6l25|5068|g2xo|ne:j64gdv|1
Ratnapura|ratnapura||LK|1g6|10wo|1fn6|h89g|ne:j63w47|1
Raton|raton||US|17p|5gh|7wpa|-mdv3|ne:j648l1|1
Raub|raub||MY|1c2|uvs|t9j|lttj|ne:j64bhb|1
Raurkela|raurkela|rourkela|IN|1b9|dew7|4rj4|i6jw|ne:j64fjl|1
Ravenna|ravenna||IT|il|2vvr|9ir0|2mag|ne:j64dq3|1
Ravensthorpe|ravensthorpe||AU|1ve|ul|-774l|pq6l|ne:j64i75|1
Rawalpindi|rawalpindi||PK|1f3|13tn4|779v|fnkd|ne:j64j4x|1
Rawlins|rawlins||US|1vp|6l1|8ygj|-mzfb|ne:j648n5|1
Rawson|rawson||AR|dx|kbj|-9a3s|-dybc|ne:j64m2z|1
Rayevskiy|rayevskiy|rayevsky|RU|74|fh8|bl6q|brth|ne:j64c6j|1
Rayong|rayong||TH|1g7|skr|2pry|lphr|ne:j649x5|1
Razgrad|razgrad||BG|1g9|tjh|9bws|5or4|ne:j63zkf|1
Reading|reading||GB|1bx|7xcc|b158|-7k8|ne:j644lf|1
Recife|recife||BR|1d4|2694o|-1qap|-7hfc|ne:j64mzp|1
Reconquista|reconquista||AR|1j9|1xl4|-68ub|-cs9g|ne:j64hiv|1
Red Deer|red deer||CA|29|1lrd|b7ai|-oe34|ne:j64kz3|1
Red Devil|red devil||US|26|p|d8ju|-xptx|ne:j64jxn|1
Red Lake|red lake||CA|1av|1d1|axs1|-k40t|ne:j64h3n|1
Redding|redding||US|bd|224a|8p66|-q8de|ne:j648h5|1
Regensburg|regensburg||DE|7k|3itj|ai8s|2lio|ne:j64eml|1
Reggane|reggane||DZ|j|pfy|5q0o|1aa|ne:j64l3x|1
Reggio di Calabria|reggio di calabria|reggio calabria|IT|ba|3v5t|863i|3cou|ne:j6467n|1
Regina|regina||CA|1jo|3rxz|at9w|-mf8a|ne:j64mnp|1
Registro|registro||BR|1o6|153t|-58ys|-a94w|ne:j6480x|1
Rehoboth|rehoboth||NA|no|jgj|-4zxo|3nsg|ne:j64dk3|1
Reims|reims||FR|cs|47o5|ak0o|v3g|ne:j64fq3|1
Remanso|remanso||BR|60|ta1|-222k|-90x8|ne:j64gwn|1
Rennes|rennes||FR|9q|4hjz|ab54|-cvw|ne:j64jpv|1
Reno|reno||US|17j|71jd|8h0k|-pojc|ne:j64l9t|1
Réo|reo||BF|1j0|syn|2n5z|-j19|ne:j63zwj|1
Requena|requena||PE|zn|dw0|-1348|-fuak|ne:j64b23|1
Resistencia|resistencia||AR|cm|8aqe|-5vvs|-cn64|ne:j64l2j|1
Reșița|resita||RO|bw|1sak|9pii|4ovl|ne:j64axj|1
Resolute|resolute||CA|19z|6y|g09d|-kc94|ne:j64mo3|1
Retalhuleu|retalhuleu||GT|1gd|sa8|3463|-jndu|ne:j63xi5|1
Revelstoke|revelstoke||CA|9t|5x0|axit|-pbwp|ne:j64h1h|1
Reyes|reyes||BO|id|5ow|-32ew|-eftw|ne:j64hc1|1
Reykjavík|reykjavik||IS|1nv|3k90|dqzg|-4pd8|ne:j64mbf|1
Reynosa|reynosa||MX|1oz|aori|5l8g|-l2hk|ne:j645un|1
Rēzekne|rezekne||LV|yc|tl0|c3yg|5ury|ne:j6452p|1
Rhinelander|rhinelander||US|1vm|8uz|9s5r|-j5wp|ne:j6495n|1
Ribeirão Preto|ribeirao preto||BR|1o6|btcz|-4jck|-a924|ne:j64m3p|1
Riberalta|riberalta||BO|id|1l3y|-2cqu|-e614|ne:j64mpl|1
Richfield|richfield||US|1sv|5vp|8b65|-o0u9|ne:j641ld|1
Richland|richland||US|1ux|ymd|9x6u|-pkgf|ne:j648e1|1
Richmond|richmond||US|1u5|jjpc|81r4|-glmf|ne:j64lbj|1
Richmond|richmond||US|q5|y9c|8jbl|-i70n|ne:j642ob|1
Richmond|richmond||AU|17q|apk|-7797|wb48|ne:j64ibv|1
Richmond|richmond||AU|1fn|88|-4fuj|uof9|ne:j64ilx|1
Rida|rida||YE|17|ywh|33c7|9lxx|ne:j649pz|1
Ridder|ridder||KZ|hz|17sk|asjm|hwel|ne:j64g3t|1
Riga|riga||LV|1gj|fwz0|c7fg|55yg|ne:j64mhn|1
Rigolet|rigolet||CA|17t|3g|bm12|-cizd|ne:j64l1n|1
Rijeka|rijeka||HR|1er|3nxs|9pro|33hw|ne:j646gz|1
Rimnicu Vilcea|rimnicu vilcea|ramnicu valcea|RO|1uj|2azq|9o2k|5852|ne:j63uqx|1
Rimouski|rimouski||CA|1fv|rgg|adpt|-eoof|ne:j64h55|1
Rinconada|rinconada||AR|rr|55w|-4t3d|-e6jm|ne:j64hgb|1
Rio Branco|rio branco||BR|9|5isq|-24wi|-ej5c|ne:j64m05|1
Río Bueno|rio bueno||CL|zt|bxc|-8n9k|-fmyo|ne:j646wt|1
Rio Claro|rio claro||BR|1o6|3v03|-4sx0|-a6z4|ne:j647yx|1
Río Colorado|rio colorado||AR|xh|8vf|-8co2|-dqgx|ne:j64l2b|1
Río Cuarto|rio cuarto||AR|fp|3an1|-73ms|-dsj0|ne:j64k31|1
Rio de Janeiro|rio de janeiro||BR|1gm|6zstc|-4wvj|-99ji|ne:j64n43|1
Río Gallegos|rio gallegos||AR|1j8|1u4k|-b2el|-eu2u|ne:j64mpd|1
Rio Grande|rio grande||BR|1gl|40xq|-6van|-b65s|ne:j64gsb|1
Rio Grande|rio grande||AR|1qh|nzr|-bj22|-eida|ne:j64l1z|1
Rio Largo|rio largo||BR|24|3ec1|-215c|-7ojk|ne:j647eh|1
Rio Negro|rio negro||BR|1ch|1em5|-5le0|-ao6k|ne:j647bd|1
Río Tercero|rio tercero||AR|fp|1571|-6was|-dqr4|ne:j64hg1|1
Rio Verde|rio verde|rioverde|MX|1in|1hpp|4p7o|-lfg8|ne:j645u7|1
Rio Verde|rio verde||BR|ld|11a6|-3thw|-awz8|ne:j64hcl|1
Río Verde|rio verde||CL|112|9y|-ba90|-fbfu|ne:j646uf|1
Riobamba|riobamba||EC|df|3p2o|-cvw|-guv8|ne:j64kmt|1
Riohacha|riohacha||CO|xe|2urm|2h1n|-fmks|ne:j64e5v|1
Rivas|rivas||NI|17z|on9|2g9w|-ie6w|ne:j64aw5|1
Rivera|rivera||UY|1gq|4abk|-6mf8|-bwpc|ne:j648az|1
Rivercess|rivercess|river cess|LR|1go|1zm|1662|-21wk|ne:j63wlf|1
Riverside|riverside||US|bd|6dle|79wb|-p5uk|ne:j641el|1
Riverton|riverton||US|1vp|8vo|980a|-n8dq|ne:j648nb|1
Rivière-du-Loup|riviere du loup||CA|1fv|cnn|a931|-ewit|ne:j647ln|1
Rivne|rivne||UA|1gs|5gua|auk6|5mkg|ne:j649nh|1
Riyadh|riyadh|ar riyadh|SA|3v|2np7s|5a58|a0vw|ne:j64n31|1
Rize|rize||TR|1gt|5zmi|8sio|8oo3|ne:j644hp|1
Rizhao|rizhao||CN|1ke|ijfs|7lds|plok|ne:j64evx|1
Roanne|roanne||FR|1gg|1kkj|9v71|vdn|ne:j646a7|1
Roanoke|roanoke||US|1u5|48wr|7zl4|-h4u0|ne:j6494n|1
Roatán|roatan||HN|qk|5sq|3i04|-ijl2|ne:j640bp|1
Robertsport|robertsport||LR|lx|98h|1g3x|-2fpy|ne:j64kjn|1
Roboré|robore||BO|1j8|7qs|-3xfj|-ct40|ne:j64hwf|1
Rocha|rocha||UY|1gu|kqi|-7e2m|-bn8i|ne:j64ix3|1
Rochester|rochester||US|17s|g6k8|994c|-gmxn|ne:j64l6l|1
Rochester|rochester||US|142|2bq7|9fod|-jti1|ne:j648bl|1
Rock Hill|rock hill||US|1m7|20ys|7hlo|-hd8c|ne:j6491d|1
Rock Island|rock island||US|pu|3jvk|8w5y|-jeki|ne:j642nj|1
Rockford|rockford||US|pu|5hii|925l|-j39l|ne:j642mv|1
Rockhampton|rockhampton||AU|1fn|1et6|-509z|w9f4|ne:j64m6h|1
Rocky Mount|rocky mount||US|18z|1915|7pas|-go8k|ne:j642rv|1
Rodeo|rodeo||AR|1il|jh|-6h58|-ethk|ne:j64hah|1
Rodos|rodos|rhodes|GR|19l|17yh|7t6k|61rl|ne:j64fvx|1
Roebourne|roebourne||AU|1ve|ev0|-4gd1|p3t1|ne:j64i7f|1
Rohtak|rohtak||IN|nr|6ssd|66zs|gew8|ne:j646rp|1
Roi Et|roi et||TH|1gw|ucg|3fum|m7t2|ne:j63v7d|1
Rolim de Moura|rolim de moura||BR|1gx|ix0|-2iie|-d8pa|ne:j64gop|1
Roma|roma||AU|1fn|48o|-5oxm|vw2r|ne:j64k6d|1
Rome|rome||IT|yf|1zke0|8zab|2ob1|ne:j64n3d|1
Rondonópolis|rondonopolis||BR|136|39zk|-3j2v|-bpls|ne:j64grt|1
Rongzhag|rongzhag|danba|CN|1kv|1i0g|6mtc|lue7|ne:j64esb|1
Rørvik|rorvik||NO|18r|20n|dwiw|2egl|ne:j64525|1
Ros Comain|ros comain|roscommon|IE|1h0|3r0|bhu5|-1r55|ne:j63wff|1
Rosario|rosario||AR|1j9|ps8o|-728k|-d04b|ne:j64m3j|1
Rosário|rosario||BR|12a|58u|-moo|-9hig|ne:j6474j|1
Rosario|rosario|puerto del rosario|PY|1is|3yb|-58f8|-c8l4|ne:j64b45|1
Rosário do Sul|rosario do sul||BR|1gl|sc1|-6hes|-brrk|ne:j6479l|1
Roseau|roseau||DM|1hr|i08|3a2a|-d5ny|ne:j64lqv|1
Roseburg|roseburg||US|1b3|nin|99h4|-qftl|ne:j648lb|1
Rosenheim|rosenheim||DE|7k|1zm1|a97r|2lmd|ne:j64emp|1
Roskilde|roskilde||DK|1lg|y65|bxec|2l8h|ne:j6473f|1
Roslavl|roslavl||RU|1ll|17yj|bkad|71jw|ne:j64byl|1
Rosso|rosso||MR|1rg|10f7|3ji0|-3e0f|ne:j64krn|1
Rostock|rostock||DE|13h|4cp4|bl7k|2lr0|ne:j64fzb|1
Rostov|rostov|rostov na donu,rostov on don|RU|1h1|mjq8|a4ha|8ier|ne:j64lih|1
Rostov|rostov||RU|1w3|q2z|c99w|8g1n|ne:j64c0t|1
Roswell|roswell||US|17p|zkg|75o9|-mei1|ne:j648kb|1
Rothera Station|rothera station|rothera research station|AQ||3m|-ehc0|-eln7|ne:j64iub|1
Rotorua|rotorua||NZ|56|17d4|-8685|11rxv|ne:j64n5h|1
Rotterdam|rotterdam||NL|1xh|ljgo|b4mr|yjw|ne:j64j43|1
Rouen|rouen||FR|o0|bexb|aleo|8c0|ne:j64fpl|1
Roura|roura||GF|mo|1px|10hw|-b7s4|ne:j646r3|0
Rouyn-Noranda|rouyn noranda||CA|1fv|ize|acas|-gxto|ne:j647n7|1
Rovaniemi|rovaniemi||FI|y8|qu5|e948|5ifb|ne:j64lxv|1
Roxas|roxas||PH|br|278g|2he5|qb5j|ne:j64kgh|1
Rrëshen|rreshen||AL|yq|7rk|8yeh|48wn|ne:j63yxh|1
Rubtsovsk|rubtsovsk||RU|2h|3ga1|b1j4|hemc|ne:j64j83|1
Rudniy|rudniy|rudny|KZ|1fh|2nog|bcl3|dj44|ne:j64ly3|1
Ruhengeri|ruhengeri||RW|19d|1uvx|-bkk|6cmk|ne:j64aw1|1
Rumbek|rumbek||SS|xz|or7|1ggw|6d1d|ne:j64kah|1
Rundu|rundu||NA|tz|18vw|-3u9s|48e3|ne:j64ki5|1
Rurrenabaque|rurrenabaque||BO|xi|92d|-33ko|-ehao|ne:j6484n|1
Rusanovo|rusanovo||RU|4a|a|f4ql|c2yz|ne:j64ke3|1
Ruse|ruse||BG|1h3|3y6m|9edl|5ket|ne:j64i2f|1
Russas|russas||BR|ca|ug9|-1248|-8520|ne:j647dl|1
Rustavi|rustavi||GE|ws|3d6v|8wrc|9nlw|ne:j64fw5|1
Rustenburg|rustenburg||ZA|198|3k2g|-5hx0|5u6o|ne:j64kch|1
Rutana|rutana||BI|1h4|g4d|-uby|6ffe|ne:j63zoz|1
Ruteng|ruteng||ID|1a1|15nc|-1ug6|ptju|ne:j64kmj|1
Ruyigi|ruyigi||BI|1h6|toa|-quy|6hd4|ne:j63zpd|1
Ruzayevka|ruzayevka||RU|14z|121r|bl5v|9mn0|ne:j645gj|1
Ryazan|ryazan||RU|1h8|b5d9|bpg8|8ihc|ne:j64lip|1
Rybinsk|rybinsk||RU|1w3|4n84|cfx3|8bjc|ne:j64c0n|1
Rzeszów|rzeszow||PL|1n3|59km|aqch|4pr4|ne:j64dgd|1
Rzhev|rzhev||RU|1s1|1cxi|c232|7cvf|ne:j645ch|1
's-Hertogenbosch|s hertogenbosch||NL|18k|2vso|b2sh|150v|ne:j63vnb|1
Saarbrücken|saarbrucken||DE|1hf|gi4x|ak0o|1hs4|ne:j64emd|1
Sabanalarga|sabanalarga||CO|4z|1gvr|2a3k|-g234|ne:j646e3|1
Sabaneta|sabaneta||DO|1je|cn0|46i2|-fai2|ne:j63x47|1
Sabaya|sabaya||BO|1ba|fx|-42qb|-ennd|ne:j64hvd|1
Sabha|sabha||LY|1hh|25cp|5sl9|33d9|ne:j64mlj|1
Sabinas Hidalgo|sabinas hidalgo||MX|19x|oq7|5ojw|-lgzs|ne:j645tp|1
Sabzewar|sabzewar|sabzevar|IR|1g8|4uiv|7rh4|ccoc|ne:j64kun|1
Sacramento|sacramento||US|bd|ydnk|89nu|-q1a8|ne:j64m8h|1
Sadah|sadah|sa dah|YE|1he|29fq|3mpi|9eci|ne:j64jxd|1
Sadiqabad|sadiqabad||PK|1f3|42ic|62da|f14m|ne:j64beh|1
Safford|safford||US|48|88c|71ci|-nii5|ne:j641az|1
Safi|safi||MA|he|7kqs|6xds|-1zao|ne:j64lhh|1
Safonovo|safonovo||RU|1ll|zzh|btih|74ap|ne:j64byt|1
Sagaing|sagaing||MM|1hl|1or7|4ots|kkg4|ne:j64043|1
Sagar|sagar||IN|10u|719s|5414|gvn0|ne:j64gdz|1
Sagastyr|sagastyr||RU|1hy|a|fq6r|r4sk|ne:j64jcj|1
Saginaw|saginaw||US|13u|2lnn|9b0z|-hzro|ne:j64jx7|1
Sagua la Grande|sagua la grande||CU|1u1|1bw9|4vzu|-h5tz|ne:j64ecd|1
Saharanpur|saharanpur||IN|1sy|ae4p|6f90|gmdo|ne:j64lzb|1
Sahiwal|sahiwal||PK|1f3|51v3|6knx|fo4u|ne:j64555|1
Saida|saida|sidon|LB|1mh|3q6e|76z2|7kwo|ne:j64611|1
Saïda|saida||DZ|1ju|31qd|7gtw|12w|ne:j64i0f|1
Saidpur|saidpur||BD|1g0|4z69|5j2s|j2q8|ne:j64ipb|1
Saidu|saidu|saidu sharif|PK|165|13vfa|7g4s|fi98|ne:j64j57|1
Saint Ann's Bay|saint ann s bay|st ann s bay|JM|1ho|ajr|3y86|-gjob|ne:j63x27|1
Saint-Étienne|saint etienne||FR|1gg|5p04|9qjk|xso|ne:j64e2x|1
Saint Gallen|saint gallen|st gallen|CH|1j1|1igc|a5x2|208k|ne:j63uil|1
Saint George's|saint george s|st george s|GD||q12|2kzy|-d8eg|ne:j64m7j|1
Saint-Georges|saint georges||CA|1fv|k6d|9vub|-f59n|ne:j64h5b|1
Saint-Georges|saint georges||GF|2o|246|u69|-b3ro|ne:j64dob|0
Saint John|saint john||CA|17l|1vsh|9pa6|-e5un|ne:j64h6j|1
Saint John's|saint john s||AG||re3|3o30|-d98k|ne:j64m7t|1
Saint-Laurent-du-Maroni|saint laurent du maroni|albina|GF|mo|iqn|16f4|-bkx1|ne:j64fdh|0
Saint-Louis|saint louis||MR|1rg|4qd4|3fm0|-3je4|ne:j64khd|0
Sakakah|sakakah|sakakah governorate|SA|1k|2r0s|6fhc|8lo5|ne:j640gh|1
Sakarya|sakarya|adapazari|TR|1hx|65ab|8qk3|6ikg|ne:j63tn5|1
Sakata|sakata||JP|1vx|25i6|8cb4|tz39|ne:j64lud|1
Sakhon Nakhon|sakhon nakhon|sakon nakhon|TH|1i0|1mtp|3ogv|mblz|ne:j649y3|1
Saki|saki|shaki|AZ|1hb|1e4o|8tub|a3yx|ne:j64hop|1
Salalah|salalah||OM|gl|4db9|3ndb|blbo|ne:j64j8b|1
Salamá|salama||GT|64|uv4|38ja|-jcv8|ne:j63xhn|1
Salamanca|salamanca||MX|md|48es|4eq0|-lov4|ne:j64d0x|1
Salamanca|salamanca||ES|c3|3h9t|8s4o|-17r0|ne:j649dd|1
Salamanca|salamanca||CL|ey|fli|-6t7o|-f7oo|ne:j64fs3|1
Salatiga|salatiga||ID|r5|3rsw|-1kef|nojp|ne:j64dzn|1
Salavat|salavat||RU|74|3fdh|bft3|bzk4|ne:j64c6x|1
Salaverry|salaverry||PE|xg|7rm|-1rfc|-gxho|ne:j64k9h|1
Salcedo|salcedo||DO|o9|yyb|45k6|-f3c7|ne:j63xox|1
Saldanha|saldanha||ZA|1vf|1gos|-72pg|3uck|ne:j64kc1|1
Sale|sale||AU|1tx|hcm|-8620|viq0|ne:j64ihn|1
Salekhard|salekhard||RU|1vz|tc9|e9dy|e9ys|ne:j64j6x|1
Salem|salem||IN|1p2|ipm0|2i27|gr85|ne:j64lzp|1
Salem|salem||US|12y|76vp|943t|-f6xr|ne:j642a3|1
Salem|salem||US|1b3|4wpe|9mo1|-qd9b|ne:j64l9z|1
Salerno|salerno||IT|bi|kgbd|8pw4|35yr|ne:j64drd|1
Salgótarján|salgotarjan||HU|1a5|ul4|ab6i|48z8|ne:j63u6j|1
Salgueiro|salgueiro||BR|1d4|wiw|-1q6s|-8dxg|ne:j64hkh|1
Salima|salima||MW|1i4|1ix9|-2ycl|7dot|ne:j64bth|1
Salina|salina||US|t2|1127|8bkn|-kx54|ne:j648p5|1
Salina Cruz|salina cruz||MX|1a6|1qjr|3gqv|-kekg|ne:j64czn|1
Salinas|salinas||US|bd|3cz4|7v1i|-q2ld|ne:j64ju3|1
Salinas|salinas||EC|mj|xue|-gz4|-hcug|ne:j646az|1
Salinópolis|salinopolis||BR|1ck|vmu|-4pb|-a5a0|ne:j64gnl|1
Salisbury|salisbury||US|18z|vwo|7n8k|-h8y1|ne:j642s3|1
Salluit|salluit||CA|1fv|2y|dbsy|-g7sj|ne:j647mn|1
Salmon|salmon||US|pq|2s1|9okt|-oeti|ne:j648dt|1
Salsk|salsk||RU|1h1|1b2g|9ymf|8wjg|ne:j64c2h|1
Salt Lake City|salt lake city||US|1sv|kpdc|8qmy|-nzo8|ne:j64m8p|1
Salta|salta||AR|1i5|azla|-5b8a|-e0ra|ne:j64m3b|1
Saltillo|saltillo||MX|eb|g5sg|5g5n|-lndh|ne:j64jdv|1
Salto|salto||UY|1i6|29ju|-6q7j|-cfaf|ne:j64jt5|1
Salum|salum|sallum|EG|138|5nm|6rkm|5e24|ne:j64egj|0
Salvador|salvador||BR|60|22o9s|-2s28|-88xf|ne:j64mzh|1
Salyan|salyan||NP|1g3|bko|62r0|hm4p|ne:j63utn|1
Salzburg|salzburg||AT|1i7|4f5z|a8wp|2sm8|ne:j64i31|1
Samaipata|samaipata||BO|1j8|29a|-3wa0|-do1w|ne:j64863|1
Samalut|samalut||EG|1t|39cx|62d8|6kyk|ne:j64egt|1
Samaná|samana||DO|1i9|8tk|448o|-euyw|ne:j63xu7|1
Samandagi|samandagi|samandag|TR|nu|2092|7qoj|7p9h|ne:j64afj|1
Samara|samara|kuybyskev|RU|1ib|odbc|begy|aqyd|ne:j64men|1
Samarinda|samarinda||ID|sl|coys|-3uw|p3xo|ne:j64kkn|1
Samarkand|samarkand|samarqand|UZ|1ic|f6ao|8i3g|ecju|ne:j64max|1
Samarra|samarra||IQ|1i1|3eb0|7buc|9eji|ne:j640o5|1
Sambalpur|sambalpur||IN|1b9|6nus|4lo0|hzx1|ne:j64fjh|1
Sambava|sambava||MG|3e|xjd|-322u|ar36|ne:j64bnz|1
Same|same||TZ|v7|dgv|-veg|831s|ne:j64atf|1
Sampit|sampit||ID|sk|1zja|-jjl|o7j0|ne:j64fbx|1
Samsun|samsun||TR|1ie|d263|8uio|7sfh|ne:j64ldt|1
Samut Prakan|samut prakan||TH|1if|8c3c|2wzp|lkbn|ne:j649w3|1
Samut Sakhon|samut sakhon||TH|1ig|1czu|2wg0|lhpw|ne:j63v33|1
Samut Songkhram|samut songkhram||TH|1ih|r21|2vhu|lfm2|ne:j63v3x|1
San|san||ML|1o7|vxm|2umk|-11t4|ne:j64d6h|1
San Andrés|san andres||CO||18y9|2oxh|-hibr|ne:j640u1|1
San Angelo|san angelo||US|1q4|1w3k|6qs0|-liz3|ne:j648tz|1
San Antonio|san antonio||US|1q4|vkko|6bjh|-l43p|ne:j64m93|1
San Antonio|san antonio||CL|1t9|28h0|-7797|-fcjo|ne:j64fsd|1
San Antonio de los Baños|san antonio de los banos||CU|xf|wys|4wmn|-hokf|ne:j646ev|1
San Antonio de los Cobres|san antonio de los cobres||AR|1i5|334|-56lh|-e7yk|ne:j64hhb|1
San Antonio Oeste|san antonio oeste||AR|1fx|6jw|-8qap|-dx11|ne:j64hfl|1
San Bernardino|san bernardino|riverside san bernardino|US|bd|11eg8|7baf|-p53w|ne:j64l6h|1
San Bernardo|san bernardo||CL|1gb|5aei|-779c|-f5iw|ne:j646v7|1
San Borja|san borja||BO|id|f5k|-36ck|-ebtg|ne:j64hc5|1
San Carlos|san carlos||VE|eg|1nk8|22is|-ep8s|ne:j6408p|1
San Carlos|san carlos||NI|17z|adn|2ec6|-i64v|ne:j640ct|1
San Carlos|san carlos||BO|1j8|4wh|-3q9c|-dnqs|ne:j6486d|1
San Carlos|san carlos||PH|17c|4wh|29eo|qg08|ne:j64ck3|1
San Carlos del Zulia|san carlos del zulia||VE|1xi|232g|1xiw|-fexs|ne:j648w1|1
San Cristóbal|san cristobal||VE|1s4|9eku|1nyc|-fhhg|ne:j64m95|1
San Cristóbal|san cristobal||DO|1ii|3auw|3y3k|-f0yq|ne:j63xut|1
San Cristobal de Las Casas|san cristobal de las casas||MX|da|4011|3l8s|-juri|ne:j645zf|1
San Diego|san diego||US|bd|1qi00|7198|-p46j|ne:j64mt7|1
San Felipe|san felipe||VE|1w2|1n8e|27r4|-eqg4|ne:j64095|1
San Felipe|san felipe||CL|1t9|19r2|-70p8|-f5og|ne:j646vd|1
San Felipe|san felipe||MX|62|g0e|6ndt|-om6o|ne:j64ctn|1
San Fernando|san fernando||TT|1ij|3k47|27bp|-d682|ne:j64395|1
San Fernando|san fernando||CL|yu|1ave|-7etk|-f7rg|ne:j646xn|1
San Fernando|san fernando||MX|1oz|mib|5bqw|-l1eo|ne:j64cxp|1
San Fernando de Apure|san fernando de apure|san fernado de apure|VE|3n|2mod|1oyg|-egln|ne:j64iyz|1
San Francisco|san francisco|san francisco oakland|US|bd|21y1c|83fg|-q8ks|ne:j64n07|1
San Francisco|san francisco||AR|fp|19km|-6qik|-db38|ne:j647ut|1
San Francisco de Macorís|san francisco de macoris||DO|hg|39p6|44x4|-f21w|ne:j646qz|1
San Francisco Gotera|san francisco gotera||SV|14y|cgo|2xpk|-ivs8|ne:j63wxp|1
San Gabriel|san gabriel||EC|by|cea|4pg|-gom8|ne:j646dv|1
San Ignacio|san ignacio|san ignacio de velasco|BO|1j8|jlb|-3ib4|-d2dc|ne:j64hwn|1
San Javier|san javier||BO|1j8|38y|-3how|-de94|ne:j64hwx|1
San Jose|san jose||US|bd|zr1c|7ztn|-q47r|ne:j64m8f|1
San José|san jose||CR|1ik|riqo|24oa|-i0t8|ne:j64mip|1
San Jose|san jose|puerto san jose|GT|it|ee7|2zk5|-jgrs|ne:j64fcn|1
San Jose|san jose|san jose de chiquitos|BO|1j8|73v|-3tqc|-d0zc|ne:j64l3t|1
San José de Mayo|san jose de mayo||UY|1ik|s6p|-7d1o|-c5ks|ne:j64ix1|1
San José del Guaviare|san jose del guaviare|san jose del guavuare|CO|13r|h2w|jtw|-fkhs|ne:j646el|1
San Juan|san juan||PR||1h4qh|3ya8|-e69g|ne:j64mrx|1
San Juan|san juan||AR|1il|9ky0|-6rfw|-eopc|ne:j64m2x|1
San Juan|san juan|san juan de la maguana|DO|1il|1kae|414p|-f9md|ne:j64kmv|1
San Juan Bautista|san juan bautista|san juan baptista|PY|147|62y|-5pv4|-c8z0|ne:j644yd|1
San Juan De Los Morros|san juan de los morros||VE|ms|1vp7|24ea|-efpg|ne:j6409l|1
San Juan de Nicaragua|san juan de nicaragua|greytown|NI|17z|rs|2c9g|-hxu0|ne:j64awb|1
San Juan del Río|san juan del rio||MX|1fo|35uv|4d94|-lfls|ne:j645yj|1
San Juan del Sur|san juan del sur||NI|17z|60e|2et0|-iei0|ne:j644ph|1
San Justo|san justo||AR|1j9|7ev|-6lit|-czgp|ne:j64hil|1
San Lorenzo|san lorenzo||PY|4r|apsw|-5fiw|-cbts|ne:j644xz|1
San Lorenzo|san lorenzo||AR|f4|10qy|-60z4|-clh0|ne:j647xn|1
San Lorenzo|san lorenzo||EC|iw|fld|9sw|-gwhl|ne:j64e77|1
San Lorenzo|san lorenzo|san lorenzo chico|BO|1pf|2bc|-4lqn|-dvro|ne:j6486h|1
San Luis|san luis||AR|1im|99km|-74y0|-e7yk|ne:j64k2z|1
San Luis|san luis||GT|1d9|2u7q|3h00|-j64g|ne:j646q7|1
San Luis Obispo|san luis obispo||US|bd|1ega|7k8w|-pv0a|ne:j648gt|1
San Luis Potosí|san luis potosi||MX|1in|l9fk|4r2v|-lnc3|ne:j64lm3|1
San Marcos|san marcos||US|1q4|1iar|6ekv|-kzpv|ne:j641yj|1
San Marcos|san marcos||GT|1io|jcw|37h8|-joc0|ne:j63xin|1
San Marino|san marino||SM||mtn|9f0h|2o02|ne:j64itf|1
San Martín|san martin||AR|13o|2il3|-7364|-eoh0|ne:j647pz|1
San Martín|san martin||CO|13r|ck1|sh4|-fslg|ne:j64ebp|1
San Martín Base|san martin base||AQ||k|-ell7|-edqw|ne:j64iw3|1
San Mateo|san mateo||US|bd|dfc6|81sh|-q7rv|ne:j641fj|1
San Matias|san matias||BO|1j8|4wg|-3i8g|-cirs|ne:j64l3p|1
San Miguel|san miguel||SV|1ir|4biz|2w1d|-iwfd|ne:j646cl|1
San Nicolas|san nicolas|san nicolas de los arroyos|AR|e6|2qke|-756c|-cwtc|ne:j647sh|1
San Pablo|san pablo||PH|xw|55tq|30k8|q04q|ne:j64ckt|1
San-Pedro|san pedro||CI|71|4i8x|10t4|-1f8g|ne:j64gk1|1
San Pedro|san pedro|san pedro de jujuy|AR|rr|1932|-56vo|-dwjg|ne:j64hgf|1
San Pedro|san pedro|san pedro de ycuamandiyu|PY|1is|780|-55vo|-c8fk|ne:j644xt|1
San Pedro de las Colonias|san pedro de las colonias|san pedro|MX|eb|15fc|5irc|-m2mb|ne:j64ctz|1
San Pedro de Macorís|san pedro de macoris||DO|1it|4o4r|3yd4|-euq0|ne:j64e8d|1
San Pedro Sula|san pedro sula||HN|f6|ekrf|3blk|-iv8s|ne:j64j1n|1
San Quintín|san quintin||MX|62|46x|6j7p|-ouoc|ne:j64ctf|1
San Rafael|san rafael||AR|13o|2c8b|-7ez4|-en9h|ne:j64l25|1
San Rafael|san rafael|san rafael de velasco|BO|1j8|xd|-3lgz|-d07j|ne:j64hx1|1
San Ramon|san ramon||PE|rt|bck|-2dvk|-g5bs|ne:j64b2p|1
San Ramón|san ramon||BO|id|50a|-2ujk|-dvb0|ne:j64hch|1
San Ramón de la Nueva Orán|san ramon de la nueva oran||AR|1i5|1l57|-4yjs|-dsao|ne:j64k35|1
San Salvador|san salvador||SV|1iu|uppk|2xsv|-j4b6|ne:j64mit|1
San Salvador de Jujuy|san salvador de jujuy||AR|rr|6k0z|-56ll|-dzuw|ne:j64k33|1
San Sebastián|san sebastian|donostia san sebastian|ES|1ct|7nto|9a9g|-fa0|ne:j64a8z|1
San Vicente|san vicente||SV|1iv|ssu|2x96|-j12i|ne:j63wy7|1
San Vicente del Caguán|san vicente del caguan||CO|bt|15o|fz4|-fzxc|ne:j64e8v|1
Sanaa|sanaa|sana a|YE|2m|171ds|3ahr|9h32|ne:j64mu3|1
Sanandaj|sanandaj||IR|w1|7hfc|7kdk|a2t4|ne:j6471b|1
Sancti Spíritus|sancti spiritus||CU|1iw|2q1p|4p7p|-h0zd|ne:j64e67|1
Sand Point|sand point||US|26|ij|bv05|-yeek|ne:j643kh|1
Sandakan|sandakan||MY|1hg|8eow|1932|pbbs|ne:j64kkt|1
Sandnes|sandnes||NO|1gv|1073|cm1y|17wk|ne:j64bbd|1
Sandspit|sandspit||CA|9t|ey|bet0|-s98d|ne:j64h03|1
Sanford|sanford||US|jp|75as|6658|-hf5s|ne:j642d7|1
Sangar|sangar||RU|1hy|3kp|dp8p|rblf|ne:j64jcb|1
Sangli|sangli||IN|11a|cvwe|3m3g|fzfa|ne:j64fkl|1
Sangolquí|sangolqui||EC|1dq|3tsm|-2e4|-gteg|ne:j646b7|1
Şanlıurfa|sanliurfa|sanhurfa|TR|1j2|9mvh|7yt0|8bce|ne:j64j2t|1
Sanming|sanming||CN|jy|4hlw|5me4|p794|ne:j6469p|1
Sanniquellie|sanniquellie||LR|187|8t3|1kvi|-1v0i|ne:j63wkx|1
Santa Ana|santa ana|santa ana del yacuma|BO|id|50xa|-2y68|-e20o|ne:j647r3|1
Santa Ana|santa ana||SV|1j5|50xa|2zze|-j71q|ne:j64e7h|1
Santa Barbara|santa barbara||US|bd|3w5c|7dpa|-pnrk|ne:j64l9j|1
Santa Bárbara|santa barbara||HN|1j6|bnz|3746|-iwu0|ne:j63tid|1
Santa Barbara|santa barbara||MX|dd|8c0|5qsk|-moig|ne:j64cuf|1
Santa Bárbara|santa barbara||CL|5m|2p2|-82nw|-ffpk|ne:j646xf|1
Santa Clara|santa clara||CU|1u1|5dao|4su8|-h50z|ne:j64ji5|1
Santa Cruz|santa cruz|santa cruz de la sierra|BO|1j8|192om|-3sz4|-djvb|ne:j64mqn|1
Santa Cruz|santa cruz||US|bd|36jg|7x9z|-q5k8|ne:j64l65|1
Santa Cruz|santa cruz||BR|1gk|lfj|-1bzs|-7q0c|ne:j647gl|1
Santa Cruz|santa cruz||EC|k8|8ou|-445|-jd58|ne:j64lqf|1
Santa Cruz Cabrália|santa cruz cabralia||BR|60|f2x|-3hm8|-8d5o|ne:j647en|1
Santa Cruz de Tenerife|santa cruz de tenerife||ES||77b1|63oc|-3hdw|ne:j64l61|1
Santa Cruz Del Quiche|santa cruz del quiche||GT|1fq|i82|37zx|-jj6t|ne:j63ymf|1
Santa Cruz do Sul|santa cruz do sul||BR|1gl|2fo9|-6d8s|-b8mo|ne:j6479z|1
Santa Fe|santa fe||AR|1j9|ahpd|-6s0f|-d0ac|ne:j64m3h|1
Santa Fe|santa fe||US|17p|1zih|7nd1|-mpf0|ne:j64m8l|1
Santa Inês|santa ines||BR|12b|1g0w|-s8o|-9q8c|ne:j6474f|1
Santa Lucía|santa lucia||UY|bk|com|-7dz0|-c36o|ne:j6410v|1
Santa Maria|santa maria||BR|1gl|5car|-6d1d|-bj4g|ne:j64k0j|1
Santa Maria|santa maria||US|bd|2df5|7hll|-ptam|ne:j648id|1
Santa Maria da Vitória|santa maria da vitoria||BR|60|i4g|-2vbg|-9h4k|ne:j64ky5|1
Santa Marta|santa marta||CO|114|995x|2es8|-fwjl|ne:j64jhz|1
Santa Rita|santa rita||VE|1rq|ojm|299i|-fbq7|ne:j648vt|1
Santa Rosa|santa rosa||US|bd|4yuo|88oo|-qarc|ne:j648hb|1
Santa Rosa|santa rosa||AR|xh|2dz4|-7uk8|-ds54|ne:j64m35|1
Santa Rosa|santa rosa||BR|1gl|19qp|-5z1j|-bo7s|ne:j64gsx|1
Santa Rosa de Copán|santa rosa de copan|santa rosa|HN|ex|rex|35ys|-j114|ne:j6448t|1
Santa Rosalía|santa rosalia||MX|63|96j|5us3|-o2du|ne:j64ctt|1
Santa Vitória do Palmar|santa vitoria do palmar||BR|1gl|lfj|-76n4|-bft0|ne:j64793|1
Santana do Livramento|santana do livramento||BR|1gl|1x7i|-6m9s|-bwh0|ne:j6478p|1
Santander|santander||ES|bo|4h2z|9aq5|-tbk|ne:j649d7|1
Santarém|santarem||BR|1ck|4xss|-irx|-bq2g|ne:j64mn5|1
Santarém|santarem||PT|1jc|mo9|8epi|-1uzo|ne:j63vg5|1
Santiago|santiago||CL|1gb|3elkw|-7635|-f5aa|ne:j64n3z|1
Santiago|santiago|santiago de los caballeros|DO|1jd|x8kh|46go|-f5ak|ne:j64lql|1
Santiago|santiago|santiago de veraguas|PA|1tn|zgj|1qi4|-hcvd|ne:j64bqn|1
Santiago|santiago||PE|po|829|-31hk|-g8ew|ne:j64b2l|1
Santiago de Compostela|santiago de compostela||ES|kb|1zbi|96vx|-1twj|ne:j64a8l|1
Santiago de Cuba|santiago de cuba||CU|1jf|bwwp|4aii|-g91h|ne:j64lqj|1
Santiago del Estero|santiago del estero||AR|1jg|7lok|-5ydl|-drvv|ne:j64l2h|1
Santiago Ixcuintla|santiago ixcuintla||MX|176|e65|4od4|-mjvs|ne:j645vl|1
Santiago Tuxtla|santiago tuxtla||MX|1tm|c3l|3yio|-kfc8|ne:j64d2j|1
Santissima Trindade|santissima trindade|mato grosso,vila bela da santissima trindade|BR|136|cjz|-37qo|-cuks|ne:j64kx7|1
Santo André|santo andre||BR|1o6|e739|-52i8|-9z0e|ne:j647yn|1
Santo Ângelo|santo angelo||BR|1gl|1eh8|-62d4|-bmts|ne:j647a7|1
Santo António|santo antonio||ST||w4|coy|1l6w|ne:j6406p|1
Santo Domingo|santo domingo||DO|gy|1a61c|3yj4|-ezd8|ne:j64my1|1
Santo Tomas|santo tomas||PE|fk|36u|-33ko|-fg68|ne:j644tv|1
Santos|santos|baixada santista|BR|1o6|10mo8|-54ta|-9xit|ne:j64l2n|1
Sanya|sanya||CN|nb|7rup|3wvz|ngxs|ne:j64jj3|1
São Borja|sao borja||BR|1gl|19zx|-6550|-c06c|ne:j64gs1|1
São Carlos|sao carlos||BR|1o6|4e7f|-4pwo|-a9is|ne:j6480f|1
São Francisco do Sul|sao francisco do sul||BR|1j7|ry8|-5mgs|-af00|ne:j64gtj|1
São Gabriel|sao gabriel||BR|1gl|16ru|-6hy8|-bn4w|ne:j6479h|1
São Gabriel da Cachoeira|sao gabriel da cachoeira|sao cabriel da cachoeira|BR|2q|br3|-110|-edm9|ne:j64kvz|1
São João da Boa Vista|sao joao da boa vista||BR|1o6|1n24|-4plk|-a118|ne:j6480b|1
São João del Rei|sao joao del rei||BR|141|1on4|-4j1g|-9hfo|ne:j64777|1
São José de Ribamar|sao jose de ribamar||BR|12b|16n5|-joc|-9g1o|ne:j6474b|1
São José do Rio Preto|sao jose do rio preto||BR|1o6|814b|-4gho|-al3g|ne:j64hj3|1
São José dos Campos|sao jose dos campos||BR|1o6|g5m1|-4z0g|-9u0f|ne:j647zn|1
São José dos Pinhais|sao jose dos pinhais||BR|1ch|e95z|-5has|-ajh4|ne:j647b3|1
São Lourenço do Sul|sao lourenco do sul||BR|1gl|jjw|-6q1w|-b52w|ne:j64797|1
São Luís|sao luis|grande s|BR|12b|m8xc|-jec|-9hkn|ne:j64m07|1
São Luiz Gonzaga|sao luiz gonzaga||BR|1gl|oja|-637o|-bs2o|ne:j647a3|1
São Mateus|sao mateus||BR|iy|1ni5|-40io|-8jk8|ne:j64gx5|1
São Paulo|sao paulo|sio paulo|BR|1o6|b7ww8|-51rj|-9zry|ne:j64n45|1
São Tomé|sao tome||ST||1w2j|2km|1fyd|ne:j64msb|1
Sapele|sapele||NG|gc|6mju|19g8|17ts|ne:j64d9z|1
Sapouy|sapouy||BF|1xc|2yl|2h5k|-doo|ne:j63zxf|1
Sapporo|sapporo||JP|oo|1iiyo|98dt|uakl|ne:j64mxz|1
Saraburi|saraburi||TH|1jh|1ilt|3448|lme8|ne:j649vl|1
Sarajevo|sarajevo||BA|1ji|exln|9eck|3xue|ne:j64mrt|1
Sarandë|sarande|saranda|AL|1u9|bor|8joy|4abk|ne:j63yql|1
Saranpaul|saranpaul||RU|uq|2ax|drrd|d2g4|ne:j64ceb|1
Saransk|saransk||RU|14z|6i3m|blzc|9om0|ne:j64c57|1
Sarapul|sarapul||RU|1sa|2674|c3sn|bj43|ne:j64cb1|1
Sarasota|sarasota||US|jp|cn7r|5uxd|-hot8|ne:j64jvb|1
Saratoga Springs|saratoga springs||US|17s|171t|98fi|-ftbu|ne:j6433x|1
Saratov|saratov||RU|1jk|i2go|b20b|9v5l|ne:j64ljb|1
Saravan|saravan|salavan|LA|1jl|49d|3d9k|mt72|ne:j63y83|1
Sargodha|sargodha||PK|1f3|bmob|6vkm|fkri|ne:j64be7|1
Sarh|sarh||TD|11t|3mjw|1ylo|3xwc|ne:j64knf|1
Sari|sari||IR|13c|5tgr|7u0w|bdq0|ne:j64g5t|1
Sariwon|sariwon||KP|pd|3bjy|894e|qydw|ne:j63w6b|1
Sarmiento|sarmiento||AR|dx|401|-9ruo|-et1t|ne:j64l23|1
Sarnen|sarnen||CH|1a9|79e|a1vi|1rlq|ne:j63wdf|1
Sarnia|sarnia||CA|1av|338s|97j6|-hnsw|ne:j647kh|1
Sarqan|sarqan|sarkand|KZ|2e|1ncn|9qgr|h4ml|ne:j64g45|1
Saryshaghan|saryshaghan||KZ|1fc|3d9|9vuz|fs1r|ne:j64g2j|1
Sasebo|sasebo||JP|169|537o|73vz|rswp|ne:j64ey1|1
Saskatoon|saskatoon||CA|1jo|49im|b6jo|-mv2k|ne:j64mnt|1
Saskylakh|saskylakh||RU|1hy|1hc|fewu|og9t|ne:j64jcf|1
Sasovo|sasovo||RU|1h8|o65|bncz|8zdb|ne:j64c5x|1
Sassandra|sassandra||CI|71|tmz|1274|-1axt|ne:j64gk7|1
Sassari|sassari||IT|1jn|2l5l|8q9w|1u4k|ne:j64jg7|1
Satadougou|satadougou||ML|u2|jm|2pcq|-2g0i|ne:j64d57|1
Satipo|satipo||PE|rt|bzg|-2evs|-g0b8|ne:j644vp|1
Satu Mare|satu mare||RO|1jq|2esq|a8rk|4wky|ne:j63uqf|1
Satun|satun||TH|1jr|qnk|1f1z|lg4b|ne:j63uwx|1
Sauðárkrókur|saudarkrokur||IS|11|22i|e3aw|-47ja|ne:j64a7x|1
Sault Ste. Marie|sault ste marie||US|13u|1snx|9yrd|-i2t9|ne:j64lbz|0
Saurimo|saurimo||AO|10c|vvo|-22j8|4dbw|ne:j64hrl|1
Savanna-la-Mar|savanna la mar|sav la mar sav savanna la mar|JM|1vj|n5c|3w5k|-gpg8|ne:j63x1d|1
Savannah|savannah||US|ks|3v17|6v2r|-hduk|ne:j64lb7|1
Savannakhet|savannakhet||LA|1jt|1tia|3jls|mgfm|ne:j64jet|0
Saveh|saveh||IR|12i|3rfx|7i8a|ascy|ne:j64g75|1
Savissivik|savissivik|thule|GL||1u|gakj|-dyet|ne:j64l5v|1
Savonlinna|savonlinna||FI|1mq|l3t|d9d6|66v5|ne:j646zl|1
Sawahlunto|sawahlunto||ID|1nl|12uq|-553|llnd|ne:j64dn1|1
Sayanogorsk|sayanogorsk||RU|wc|16xm|bdn2|jl90|ne:j64cnj|1
Sayhut al Ghamirah|sayhut al ghamirah|sayhut|YE|1q|59|39d5|azeu|ne:j64jyh|1
Saywun|saywun|seiyun|YE|n9|1h1n|3f0m|agg1|ne:j649q7|1
Scarborough|scarborough||GB|199|1igb|bmtw|-3bg|ne:j64adn|1
Schaffhausen|schaffhausen||CH|1jv|q4n|a83o|1um2|ne:j63ujx|1
Schefferville|schefferville||CA|1fv|d3|bqu8|-ebk7|ne:j647mj|1
Schenectady|schenectady||US|17s|375z|96cy|-fuiw|ne:j64973|1
Schwerin|schwerin||DE|13h|22kh|bhu5|2g3b|ne:j640ph|1
Schwyz|schwyz||CH|1jx|axt|a2t4|1uq8|ne:j63ukj|1
Scone|scone||AU|17q|3kg|-6vj0|wbyt|ne:j64ie1|1
Scott Base|scott base||AQ||2d|-goo5|zqn7|ne:j64iut|1
Scottsbluff|scottsbluff||US|17a|jnn|8z1v|-m7un|ne:j648qn|1
Scottsdale|scottsdale||US|48|bvt|77yz|-nz6g|ne:j648fj|1
Scottsdale|scottsdale||AU|1pl|1wk|-8tif|vm8v|ne:j64inf|1
Scranton|scranton||US|1cy|3cis|8vil|-g7tf|ne:j64987|1
Sdid Bouzid|sdid bouzid|sidi bouzid|TN|1ky|whe|7i6v|21aw|ne:j63t6z|1
Seattle|seattle||US|1ux|1tvww|a72f|-q7zv|ne:j64mt3|1
Sebba|sebba||BF|1vv|2ix|2voc|43c|ne:j64021|1
Sechura|sechura||PE|1dv|hrg|-16wc|-hbm0|ne:j64ayx|1
Seeb|seeb|as sib|OM|15t|53i0|52pu|cgxt|ne:j64j8h|1
Sefra|sefra|ain sefra|DZ|177|1cxo|70s4|-4h3|ne:j64hyf|1
Segezha|segezha||RU|td|pqi|dnxo|7cuj|ne:j64bz1|1
Ségou|segou||ML|1o7|2mvc|2vpc|-1caw|ne:j64lx3|1
Séguéla|seguela||CI|1vn|13h1|1pcg|-1fgs|ne:j64gjn|1
Sekondi|sekondi|sekondi takoradi|GH|1vd|64vc|1255|-d5c|ne:j64kpp|1
Selawik|selawik||US|26|n4|e9x3|-yan2|ne:j643qj|1
Selfoss|selfoss||IS|8g|4ub|dpba|-4i0h|ne:j64a81|1
Sélibaby|selibaby|selibabi|MR|mn|cs|3912|-2m09|ne:j64d4h|1
Selkirk|selkirk||CA|121|7pe|aqyk|-krk1|ne:j647gn|1
Selma|selma||US|23|fj2|6y24|-ingk|ne:j648xj|1
Semarang|semarang||ID|r5|tx5s|-1hqn|nnzp|ne:j64mid|1
Sembe|sembe||CG|1iy|7gv|cno|34i0|ne:j64ftl|1
Semey|semey|semipalatinsk|KZ|hz|6o8p|at5q|h7em|ne:j64lyf|1
Semnan|semnan||IR|1k1|2obe|7mcc|bfu7|ne:j64g5x|1
Sena Madureira|sena madureira||BR|9|k7k|-1xzg|-epv0|ne:j64kvh|1
Senanga|senanga||ZM|1vd|7px|-3gdo|4zjw|ne:j64a4l|1
Sendai|sendai||JP|14b|1c840|87fv|u846|ne:j64lub|1
Senhor do Bonfim|senhor do bonfim||BR|60|11ef|-28mo|-8m3w|ne:j64gwj|1
Senmonorom|senmonorom||KH|162|64o|2o2c|mz5s|ne:j63zef|1
Sennar|sennar||SD|1k2|2sei|2wjw|779c|ne:j64kb3|1
Sensuntepeque|sensuntepeque||SV|b3|ktp|2z3k|-izvg|ne:j646cd|1
Seoul|seoul||KR|1k3|5tyn4|81vn|r7x6|ne:j64n1f|1
Sept-Îles|sept iles||CA|1fv|jti|as8p|-e81c|ne:j64k2b|1
Serang|serang||ID|6s|3j4v|-1b58|mr20|ne:j64dzx|1
Serdar|serdar|gyzlarbat|TM|69|11e2|8cqj|c28q|ne:j6442z|1
Serdobsk|serdobsk||RU|1cz|sa4|b8su|9h7u|ne:j64c5l|1
Serebryansk|serebryansk||KZ|hz|jh|anhj|hvpl|ne:j6463l|1
Seremban|seremban||MY|17b|7zqt|kwx|luko|ne:j64bh5|1
Seres|seres|serres|GR|ue|174e|8t0s|51pl|ne:j64fvf|1
Sergiyev Posad|sergiyev posad||RU|155|2cas|c2n8|86is|ne:j645dn|1
Serov|serov||RU|1nz|23ye|crzq|czh6|ne:j64j7f|1
Serowe|serowe||BW|cd|11h9|-4srg|5q3g|ne:j64m53|1
Serpukhov|serpukhov||RU|155|2wm8|brug|80t8|ne:j64c23|1
Serrinha|serrinha||BR|60|17ul|-2hw0|-8d04|ne:j64gwb|1
Sesheke|sesheke||ZM|1vd|fjp|-3qsn|57i0|ne:j64a47|0
Sete Lagoas|sete lagoas||BR|141|4bcm|-462o|-9hfo|ne:j64gpl|1
Sétif|setif||DZ|1hc|5vzs|7r60|15o0|ne:j64l4n|1
Settat|settat||MA|cx|3gt0|72pk|-1mso|ne:j64brh|1
Setúbal|setubal||PT|za|2j12|89as|-1wo8|ne:j64j3v|1
Sevastopol|sevastopol|sevastapol|RU|fa|84lc|9k4w|767u|ne:j64map|1
Severnyy|severnyy|severny|RU|vt|8x6|eho3|dqs1|ne:j645i1|1
Severo Kurilsk|severo kurilsk||RU|1hz|1va|av4p|xgcy|ne:j64cs3|1
Severobaykalsk|severobaykalsk||RU|ah|jwo|bx9w|nfgq|ne:j64jah|1
Severodvinsk|severodvinsk||RU|4a|45x0|du84|8jbw|ne:j64j6d|1
Severomorsk|severomorsk||RU|15q|15lt|esyz|75w7|ne:j645al|1
Severouralsk|severouralsk||RU|1nz|rvu|cw65|cunz|ne:j645j5|1
Seville|seville||ES|31|pz7x|80ma|-1a54|ne:j64mbt|1
Seward|seward||US|26|28k|cvxq|-w1bg|ne:j64j0j|1
Seymour|seymour||AU|1tx|2ul|-7xra|v3t5|ne:j64iif|1
Sfax|sfax||TN|1k7|9pkq|7g4s|2aps|ne:j64jxb|1
Sfintu-Gheorghe|sfintu gheorghe|sfantu gheorghe|RO|f8|1ath|9tx4|5j0q|ne:j63ur7|1
Shache|shache|yarkant county|CN|1vs|i8xa|88hx|gk2c|ne:j64lrn|1
Shadrinsk|shadrinsk||RU|wo|1pbr|c0qt|dmzx|ne:j64c8b|1
Shah Alam|shah alam||MY|1jy|abna|nnv|lrkc|ne:j63wr7|1
Shahhat|shahhat||LY|1i|yq0|71ax|4oou|ne:j64ddv|1
Shahjahanpur|shahjahanpur||IN|1sy|6v8y|5z4k|h4ju|ne:j64gbl|1
Shahrekord|shahrekord|shar e kord|IR|co|2rnl|6xe2|awe4|ne:j640qt|1
Shahrisabz|shahrisabz||UZ|tp|aooh|8dei|ebob|ne:j649rv|1
Shahrud|shahrud||IR|1k1|2trl|7t1h|bs3h|ne:j64703|1
Shakhty|shakhty||RU|1h1|4qrk|a87o|8mq4|ne:j64c2p|1
Shalaurova|shalaurova|shalaurova island|RU|1hy|a|foz0|uot5|ne:j64cpl|1
Shalqar|shalqar|shalkar|KZ|3r|l14|a93v|crzh|ne:j64ktp|1
Shamattawa|shamattawa||CA|121|o6|byy0|-jqip|ne:j64gyf|1
Shamva|shamva||ZW|12u|7yl|-3pn0|6rlg|ne:j64a4v|1
Shangdu|shangdu||CN|17d|ej3|8wli|oc17|ne:j646nd|1
Shanghai|shanghai||CN|1kf|8x81k|6ovs|q0zu|ne:j64n3p|1
Shangqiu|shangqiu||CN|o6|11kmg|7du4|osch|ne:j64jlb|1
Shangrao|shangrao||CN|rf|oj5t|63og|pa9g|ne:j64ewl|1
Shangzhi|shangzhi||CN|o5|22tw|9ox8|rff8|ne:j64f1v|1
Shannon|shannon||IE|e8|6rx|bany|-1we9|ne:j6466p|1
Shantou|shantou||CN|me|ybc8|50c8|p07t|ne:j64mi1|1
Shanxian|shanxian|shan county|CN|1ke|1lgb|7gg0|ovog|ne:j64ev5|1
Shaoguan|shaoguan||CN|me|ffre|5bcw|oce0|ne:j64lpj|1
Shaowu|shaowu||CN|jy|2evd|5ung|p6mw|ne:j64dwb|1
Shaoxing|shaoxing||CN|1x7|gnjc|6fhz|pub5|ne:j64jmv|1
Shaoyang|shaoyang||CN|p9|z75|5sc0|nu0x|ne:j64jk5|1
Shar|shar|charsk|KZ|hz|70f|ampv|hdf9|ne:j64g3x|1
Sharbaqty|sharbaqty|sharbakty|KZ|1cq|2z|b93b|gr0b|ne:j6463b|1
Sharjah|sharjah||AE|1ki|nn3n|5frm|bvip|ne:j6442n|1
Sharya|sharya||RU|w5|rf0|cigm|9r5i|ne:j64bz7|1
Shashemene|shashemene|shashamane|ET|g|2g8e|1jk4|89rg|ne:j64fyh|1
Shawinigan|shawinigan||CA|1fv|11xl|9z6o|-fl7p|ne:j64h5x|1
Shawnee|shawnee||US|1ao|mv0|7kpg|-kry2|ne:j648rf|1
Shchekino|shchekino|shchyokino|RU|1rt|1ufc|bkrz|81gn|ne:j645ff|1
Shebekino|shebekino||RU|7q|yve|at00|7wog|ne:j645ft|1
Sheberghan|sheberghan||AF|r7|1zy1|7uus|e38n|ne:j64845|1
Sheboygan|sheboygan||US|1vm|15ft|9dl0|-ist4|ne:j642y7|1
Sheffield|sheffield||GB|1mi|rplw|bfs3|-bko|ne:j644m5|1
Sheikhu Pura|sheikhu pura|sheikhupura|PK|1f3|7qs7|6sr4|fuws|ne:j6454t|1
Shelburne|shelburne||CA|19o|2fz|9dp4|-e00a|ne:j64h6p|1
Shemonaikha|shemonaikha||KZ|hz|kyw|auoc|hjze|ne:j6463f|1
Shendi|shendi||SD|1gp|3zzn|3kph|75vc|ne:j64a9v|1
Shenyeng|shenyeng|shenyang|CN|ys|2ulo8|8yl1|qgj4|ne:j64mxd|1
Shenzhen|shenzhen||CN|me|4ihjc|4u13|ogk2|ne:j64msv|1
Shepparton|shepparton||AU|1tx|pvy|-7so2|v5ui|ne:j64iij|1
Sherbrooke|sherbrooke||CA|1fv|2zr8|9qb4|-fes8|ne:j647lx|1
Sherlovaya Gora|sherlovaya gora||RU|dn|bf|atwa|oxdq|ne:j645mn|1
Sherman|sherman||US|1q4|v30|77jc|-kpfq|ne:j648u3|1
Shibin el Kom|shibin el kom|shibin al kawm|EG|1s|3x4k|6k1s|6mfc|ne:j63x8n|1
Shieli|shieli||KZ|1fw|n0o|9gsm|eb1o|ne:j64g11|1
Shihezi|shihezi||CN|1vs|dpts|9htk|ift7|ne:j64jix|1
Shijiazhuang|shijiazhuang|shijianzhuang|CN|o3|1fsyw|85m0|ojbg|ne:j64lsj|1
Shilka|shilka||RU|dn|awk|b48i|ovaq|ne:j645mj|1
Shillong|shillong||IN|13i|81rb|5hax|joy8|ne:j64flh|1
Shimanovsk|shimanovsk||RU|2t|gka|b594|rdbj|ne:j64jat|1
Shimonoseki|shimonoseki||JP|1vy|59ne|7a2u|s2dq|ne:j646m1|1
Shinyanga|shinyanga||TZ|1kn|2aua|-s8k|75vc|ne:j64aox|1
Shira|shira||RU|uo|77y|bogi|ja2z|ne:j64chd|1
Shiraz|shiraz||IR|jd|qksg|6cn3|b9m9|ne:j64mm5|1
Shishmaref|shishmaref||US|26|72|e78q|-zlf3|ne:j649hp|1
Shishou|shishou||CN|p6|4yuj|6d64|o3a8|ne:j64eqv|1
Shivamogga|shivamogga||IN|th|e0o7|2zhk|g70w|ne:j64fk3|1
Shiyan|shiyan||CN|p6|gi4w|6zb8|nqs8|ne:j646jf|1
Shizuishan|shizuishan||CN|18a|2xdm|8eq5|mvu2|ne:j64lrx|1
Shizuoka|shizuoka||JP|1kq|f1bt|7hya|tnse|ne:j64f4j|1
Shkodër|shkoder||AL|1kr|3c6v|90lp|46lx|ne:j64hnn|1
Sholapur|sholapur|solapur|IN|11a|mnl4|3sd0|g9mt|ne:j64l7p|1
Shonzhy|shonzhy|chundzha|KZ|2e|30e|9bz1|h173|ne:j64g4f|1
Shostka|shostka||UA|1np|22pl|b49a|76bx|ne:j649ov|1
Showa Station|showa station||AQ||1o|-esn4|8iol|ne:j64iwn|1
Shoyna|shoyna||RU|17f|8c|ejnu|9gja|ne:j64j6t|1
Shreveport|shreveport||US|zy|5bed|6yrs|-k3j8|ne:j64lad|1
Shu|shu||KZ|1x6|wqv|9cdt|ft0o|ne:j64gaf|1
Shuangcheng|shuangcheng||CN|o5|2suu|9pxb|r2ds|ne:j64f31|1
Shuangyashan|shuangyashan||CN|o5|apsw|a040|s5i4|ne:j64f1p|1
Shulan|shulan||CN|rj|1orw|9inv|r7jj|ne:j64ezj|1
Shumen|shumen||BG|1ks|1vcj|99vg|5rse|ne:j64877|1
Shumerlya|shumerlya||RU|e2|r6m|bw4g|9y7o|ne:j64cbp|1
Shuozhou|shuozhou||CN|1kg|c7tc|8f8s|o3fs|ne:j64epx|1
Shuya|shuya||RU|qr|1au9|c6ov|8v63|ne:j645bp|1
Shuyang|shuyang||CN|re|11xqo|7bcj|pggm|ne:j64ewz|1
Shwebo|shwebo||MM|1hl|1wlu|4u7r|kidd|ne:j64irx|1
Shymkent|shymkent||KZ|1md|9z3k|92jk|ewzy|ne:j64lz3|1
Si Racha|si racha||TH|du|3u1w|2tja|lmrr|ne:j649wl|1
Sialkote|sialkote|sialkot|PK|1f3|a8d0|6yxc|fzb4|ne:j6454l|1
Šiauliai|siauliai||LT|1y3|2v14|bzmi|4zz6|ne:j64533|1
Sibay|sibay||RU|74|1biu|bapf|ckgj|ne:j64c6n|1
Šibenik|sibenik||HR|1y4|smw|9deg|3eqa|ne:j63x6z|1
Sibiti|sibiti||CG|10j|hln|-sgw|2v0c|ne:j64ggx|1
Sibiu|sibiu||RO|1ku|3c19|9tdf|568r|ne:j644qz|1
Sibolga|sibolga||ID|1nn|4nog|di4|l6cg|ne:j64kix|1
Sibu|sibu||MY|1jm|4da0|hrq|nyzi|ne:j64kkx|1
Sibut|sibut||CF|x5|qfv|188q|438x|ne:j64h97|1
Sica Sica|sica sica||BO|xi|ry|-3ppw|-eilw|ne:j6484j|1
Sicuani|sicuani||PE|fk|pwn|-329c|-f9m4|ne:j64azl|1
Sidi bel Abbes|sidi bel abbes||DZ|1kx|4gyk|7jj3|-4xs|ne:j64hxx|1
Sidney|sidney||US|17a|50c|8tfq|-m2l3|ne:j648qj|1
Siem Reap|siem reap|siemreab|KH|1kz|2ceu|2v4y|m9b8|ne:j64m45|1
Siena|siena||IT|1r5|14lt|9a8i|2fks|ne:j64dqz|1
Sierra Colorado|sierra colorado|sierra colorada|AR|1fx|16a|-8p51|-ej5c|ne:j64hft|1
Sierra Mojada|sierra mojada||MX|eb|a|5ujw|-m4yw|ne:j64cu1|1
Siglan|siglan||RU|111|a|cni9|wo1y|ne:j64crp|1
Signy Research Station|signy research station||AQ||8|-czu1|-9ruv|ne:j64iwd|1
Siguiri|siguiri||GN|t0|12pb|2g3f|-1yqa|ne:j64gif|1
Siirt|siirt||TR|1l0|2fzm|84s0|8zk2|ne:j63tun|1
Sikar|sikar||IN|1fz|8kn4|5x1k|g3s8|ne:j64g9n|1
Sikasso|sikasso||ML|1l1|4u6x|2fck|-17ts|ne:j64d5p|1
Sikonge|sikonge||TZ|1og|kx5|-17fr|70us|ne:j64ap5|1
Silchar|silchar||IN|4o|39l5|5ba8|jvz0|ne:j64fl7|1
Siliana|siliana||TN|1l4|ksw|7qf5|20eh|ne:j63t7f|1
Siliguri|siliguri||IN|1v3|b1ti|5q6c|iyiu|ne:j64gcx|1
Silvassa|silvassa||IN|fq|l3z|4cdm|fnee|ne:j646sf|1
Simao|simao||CN|1wj|3hk5|4vrz|ln5i|ne:j64esf|1
Simferopol|simferopol||RU|fa|7obg|9mtw|7b3v|ne:j649mz|1
Simla|simla|shimla|IN|oj|3pvj|6nyw|gjf6|ne:j646rd|1
Sin-Ni|sin ni||KP|1c0|f0n|8gow|qw34|ne:j63w6x|1
Sincelejo|sincelejo||CO|1n6|5lj7|1zoo|-g5mw|ne:j64eap|1
Sing Buri|sing buri||TH|1l7|fgu|36va|lip6|ne:j63v1f|1
Singapore|singapore||SG||333ro|9zq|m9cb|ne:j64n4b|1
Singaraja|singaraja||ID|67|50x0|-1qm8|oo2o|ne:j64e0n|1
Singida|singida||TZ|1l8|1c68|-116s|7g20|ne:j64ast|1
Singkawang|singkawang||ID|si|5bd8|71c|ncs7|ne:j64e05|1
Singleton|singleton||AU|17q|anp|-6zb3|wecw|ne:j64ich|1
Sinnamary|sinnamary||GF|mo|2gc|15ig|-bcn4|ne:j646r7|0
Sinop|sinop||TR|1la|qvm|9092|7j8q|ne:j63tq1|1
Sinop|sinop||BR|136|6wx|-2jfo|-bvxk|ne:j64kxd|1
Sinuiju|sinuiju||KP|1bz|66b4|8laz|qo1h|ne:j64ln7|0
Sion|sion||CH|1t4|ln1|9ws6|1kqs|ne:j63uhl|1
Sioux City|sioux city||US|qb|1y5w|93xo|-knts|ne:j648oj|1
Sioux Falls|sioux falls||US|1m9|3c5o|9c18|-kqdg|ne:j64lab|1
Sioux Lookout|sioux lookout||CA|1av|3iy|arty|-jp8e|ne:j64h3j|1
Siping|siping||CN|rj|bwpl|993o|qnc4|ne:j64jn3|1
Siracusa|siracusa|syracuse|IT|1kw|2nex|7y1c|39z8|ne:j64dsh|1
Sirjan|sirjan|saidabad|IR|ui|3r14|6be4|by0k|ne:j6471v|1
Sironko|sironko||UG|a3|avo|9n8|7cns|ne:j63u37|1
Sirsa|sirsa||IN|nr|3w5j|6bjs|g2xo|ne:j64fgf|1
Şirvan|sirvan|ali bayramli,shirvan|AZ|0|1ijg|8k4b|ahgz|ne:j64ho5|1
Sisaket|sisaket|si sa ket|TH|1kt|yj3|38o3|md0i|ne:j649w7|1
Sisimiut|sisimiut||GL|1fe|417|ecl8|-bi3e|ne:j64lwp|1
Sisophon|sisophon||KH|aq|12ta|2wta|m2mh|ne:j64hqb|1
Sitapur|sitapur||IN|1sy|3ivn|5x70|hb2k|ne:j64727|1
Siteki|siteki||SZ|106|4qw|-5o4m|6ujk|ne:j63v9f|1
Sitia|sitia||GR|wd|6td|7jlw|5ldm|ne:j64fv5|1
Sitka|sitka||US|26|6w3|c8a4|-t06z|ne:j64lc7|1
Sittwe|sittwe||MM|1g1|3u54|4beg|jwo0|ne:j64m6x|1
Sivas|sivas||TR|1lf|5npy|8ioe|7xri|ne:j64ag5|1
Siwa|siwa|siwa oasis|EG|138|ht4|69b4|5gvz|ne:j64knj|1
Sixaola|sixaola||CR|z6|1en|21gk|-hpi0|ne:j64e6d|0
Skagway|skagway||US|26|qj|cqs7|-t037|ne:j64jxz|1
Skellefteå|skelleftea||SE|1ul|o5r|dvs9|4hng|ne:j649md|1
Skien|skien||NO|1px|1kky|cosg|222o|ne:j64j4d|1
Skikda|skikda||DZ|1lh|4tr1|7wkk|1h8o|ne:j64hyj|1
Skopje|skopje||MK|cc|al8n|902o|4ldr|ne:j64lx5|1
Skovorodino|skovorodino||RU|2t|7pz|bkjd|qk5b|ne:j64jav|1
Slantsy|slantsy||RU|ym|rxt|co3w|60mj|ne:j645az|1
Slatina|slatina||RO|1aq|1oy4|9iv2|581q|ne:j63uaz|1
Slavgorod|slavgorod||RU|2h|qcd|bczl|gv0o|ne:j64cgl|1
Slavonski Brod|slavonski brod||HR|9u|23ee|9ogj|3v0c|ne:j646hv|1
Slidell|slidell||US|zy|1szz|6hlq|-j8r7|ne:j641w3|1
Sligo|sligo||IE|1lj|flw|bmq7|-1tgh|ne:j64dp3|1
Sliven|sliven||BG|1lk|22cw|95be|5n5w|ne:j6486p|1
Slobodskoy|slobodskoy||RU|vg|11s2|cl2p|ar94|ne:j64c95|1
Slobozia|slobozia||RO|pk|14np|9jwk|5va4|ne:j63ued|1
Slyudyanka|slyudyanka||RU|qg|eih|b2ka|m858|ne:j64j97|1
Smara|smara||MA|ml|115h|5q9x|-2i5d|ne:j64kip|1
Smithers|smithers||CA|9t|4th|bqky|-r982|ne:j64kzb|1
Smithton|smithton||AU|1pl|38q|-8r2h|v3q7|ne:j64inb|1
Smolensk|smolensk||RU|1ll|6vof|bqpf|6va1|ne:j64li5|1
Sobral|sobral||BR|ca|3dws|-sh0|-8ncc|ne:j647dp|1
Sobral Base|sobral base|sobral scientific base|AQ||14|-hedr|-8oif|ne:j64ivz|1
Sóc Trăng|soc trang||VN|1o9|6fhc|223p|mpqw|ne:j64a1v|1
Sochi|sochi||RU|wb|70s8|9ccc|8ik4|ne:j64lij|1
Socorro|socorro||CO|1jb|j7j|1duj|-fpcs|ne:j64e5p|1
Socorro|socorro||US|17p|6os|7atp|-mwu6|ne:j648kt|1
Sodankylä|sodankyla||FI|y8|6we|eg6z|5p8w|ne:j64fzf|1
Sodo|sodo||ET|1mp|1eq1|1h8o|83a4|ne:j64kt1|1
Sofia|sofia||BG|lt|peco|95d1|4zwb|ne:j64mqz|1
Sogamoso|sogamoso||CO|9g|2pnb|184w|-fmt4|ne:j646bh|1
Sohag|sohag||EG|1ne|cuyo|5ov4|6slk|ne:j64ei3|1
Sohano|sohano||PG|197|1sy|-15w9|x5g7|ne:j64bpd|1
Sokcho|sokcho||KR|kf|1tx2|86tj|rk7s|ne:j64cjl|1
Söke|soke||TR|5d|1nod|83ag|5vhz|ne:j64adx|1
Sokodé|sokode||TG|cg|2iwj|1xdd|8vg|ne:j649dp|1
Sokol|sokol||RU|1ub|wji|cqu0|8liw|ne:j64c0h|1
Sokolo|sokolo||ML|1o7|3di|35op|-1bbp|ne:j64d6d|1
Sokoto|sokoto||NG|1lo|foya|2srs|14fk|ne:j64mgl|1
Sol-lletsk|sol lletsk|sol iletsk|RU|1b5|l5n|ayr7|bsdr|ne:j64cbz|1
Soldado Bartra|soldado bartra||PE|zn|a|-jex|-g8ma|ne:j64b1v|1
Soledad|soledad||CO|4z|ez8k|2c9c|-g0xg|ne:j646dz|1
Solenzo|solenzo||BF|6t|80h|2m09|-vi9|ne:j63zsd|1
Solikamsk|solikamsk||RU|1d3|25sc|csf0|c5vw|ne:j6462d|1
Solnechnogorsk|solnechnogorsk||RU|155|19fv|c1hr|7xch|ne:j64c1v|1
Sololá|solola||GT|1lp|z0d|35zm|-jjkm|ne:j63xk5|1
Solothurn|solothurn||CH|1lq|bgl|a4ag|1m5m|ne:j63wd1|1
Solwezi|solwezi||ZM|19c|1e5k|-2lz8|5npc|ne:j64a3p|1
Somoto|somoto||NI|10w|foc|2vzc|-ik2u|ne:j63vb3|1
Sơn La|son la||VN|1lt|epa|4kkg|m9rw|ne:j63tbd|1
Sơn Tây|son tay||VN|ph|4297|4j3q|mm2y|ne:j649yl|1
Songea|songea||TZ|1h5|2pkh|-2aeo|7n2s|ne:j64kif|1
Songkhla|songkhla||TH|1lv|11ig|1jms|ljxc|ne:j64k8l|1
Songnam|songnam|seongnam|KR|mv|k6uo|80w6|r8zi|ne:j64isf|1
Songo|songo||AO|1s7|85v|-1kpk|36l0|ne:j64hs5|1
Songyuan|songyuan|fuyu|CN|rj|amn0|9om4|qr48|ne:j64ey5|1
Sonipat|sonipat||IN|nr|5dax|67rk|giag|ne:j646rl|1
Sonsón|sonson||CO|3c|eip|183y|-g55a|ne:j646bd|1
Sonsonate|sonsonate||SV|1lx|3mcz|2xv4|-j8d0|ne:j646ch|1
Sopore|sopore|suyyapur|IN|r1|1cmz|7cns|fyl7|ne:j646sb|1
Sorata|sorata||BO|xi|1ou|-3du4|-eps9|ne:j6484t|1
Sorø|soro||DK|1lg|5j3|bvq2|2h8z|ne:j63yc1|1
Sorocaba|sorocaba||BR|1o6|c2mp|-5190|-a6a4|ne:j64m3n|1
Sorong|sorong||ID|qe|2ov3|-6lm|s502|ne:j64jox|1
Soroti|soroti||UG|1lz|su|d74|779c|ne:j64al3|1
Sosnogorsk|sosnogorsk||RU|vt|mn3|dmp8|bjun|ne:j64c8x|1
Sotik|sotik|chamagel|KE|1gi|1j05|-58s|7izk|ne:j64b9l|1
Sotouboua|sotouboua||TG|cg|g8u|1u0y|7lm|ne:j63t3z|1
Soubré|soubre||CI|71|2c1x|18og|-1f04|ne:j64gjx|1
Souk Ahras|souk ahras||DZ|1m0|2w4j|7s0o|1pcc|ne:j64i15|1
Sousse|sousse||TN|1m4|70bg|7ogs|29ze|ne:j64lc3|1
South Bend|south bend||US|q5|551q|8xmp|-ihic|ne:j642px|1
Southampton|southampton||GB|1mk|88m9|awqw|-asw|ne:j644bz|1
Southaven|southaven||US|149|2lkk|7htl|-jagz|ne:j642jn|1
Southend-on-Sea|southend on sea|southend|GB|1ml|d95e|b1rg|5k0|ne:j644l3|1
Southern Cross|southern cross||AU|1ve|57|-6ov5|pknj|ne:j64i95|1
Sovetsk|sovetsk||RU|sm|xf1|bsxq|4ouc|ne:j64bx3|1
Sovetsk|sovetsk||RU|vg|dsd|cca1|ahrh|ne:j64c91|1
Sovetskaya Gavan|sovetskaya gavan|savetskaya gavan|RU|un|my4|ahur|u2d9|ne:j64jdb|1
Soyo|soyo||AO|1wr|1g2r|-1bao|2ng4|ne:j64hsf|1
Spanish Town|spanish town||JM|1hp|99vk|3urd|-ghr0|ne:j646d3|1
Spartanburg|spartanburg||US|1m7|2nry|7ho6|-hk6z|ne:j642kt|1
Sparti|sparti||GR|1cw|chn|7y29|4t2h|ne:j64fu3|1
Spassk Dalniy|spassk dalniy|spassk dalny|RU|1eq|zf0|9k4y|sgue|ne:j64cph|1
Spencer|spencer||US|qb|8n7|98wt|-ke5s|ne:j641od|1
Split|split||HR|1ms|4lp1|9bt0|3j30|ne:j64eff|1
Spokane|spokane||US|1ux|7gah|a7to|-p60n|ne:j64l9b|1
Spring Hill|spring hill||US|jp|2gi1|63qt|-hoxx|ne:j642fb|1
Springbok|springbok||ZA|19f|81y|-6cwr|3tzl|ne:j64lgj|1
Springfield|springfield||US|12y|91g4|9100|-fk14|ne:j6429p|1
Springfield|springfield||US|14a|4irf|7yvs|-k028|ne:j64juj|1
Springfield|springfield||US|pu|2vy3|8j94|-j7qs|ne:j64izj|1
Springfield|springfield||US|1aj|1t9c|8k0w|-hyls|ne:j642ud|1
Springfield|springfield||US|1b3|178g|9fwn|-qcwk|ne:j641jn|1
Springs|springs||ZA|kk|525v|-5mp4|63d8|ne:j64bmb|1
Srednekolymsk|srednekolymsk||RU|1hy|2o3|egg4|wy18|ne:j64jbn|1
Sri Jayawardenepura Kotte|sri jayawardenepura kotte|sri jawewardenepura kotte|LK|ei|2hde|1h8o|h4wc|ne:j64ljt|1
Srinagar|srinagar||IN|r1|ofmo|7b4r|g19f|ne:j64lv5|1
St. Anthony|st anthony||CA|17t|68|b0h9|-bx0f|ne:j64h7h|1
St-Augustin|st augustin|saint augustin|CA|1fv|321|azdz|-ckiu|ne:j647n3|1
St. Augustine|st augustine||US|jp|1mwb|6eo5|-hfff|ne:j648yf|1
St.-Benoit|st benoit|saint benoit|RE|xl|r8u|-4ian|bxvs|ne:j64glv|1
St.-Brieuc|st brieuc|saint brieuc|FR|9q|152f|aecv|-lh5|ne:j646sx|1
St. Charles|st charles||US|14a|7q5h|8b9f|-jecm|ne:j648pj|1
St. Charles|st charles||US|12o|1heg|89v3|-ghnx|ne:j6432b|1
St. Cloud|st cloud||US|142|2f16|9rjw|-k6k6|ne:j648c3|1
St.-Denis|st denis|saint denis|RE|xl|42n3|-4h3p|bvu9|ne:j64m03|1
St. George|st george||US|1sv|243y|7yaq|-ocex|ne:j64iy1|1
St.-Jerome|st jerome|saint jerome|CA|1fv|1oiv|9t4z|-fuzk|ne:j647mz|1
St. John's|st john s|saint john s|CA|17t|2tfx|a762|-bahm|ne:j64mov|1
St. Joseph|st joseph||US|14a|1o70|8iuy|-kbu8|ne:j648q1|1
St. Louis|st louis||US|14a|1b4rc|8a4i|-jcb7|ne:j64mtb|1
St.  Paul|st paul|saint paul|US|142|fr0m|9msg|-jy8y|ne:j64l8t|1
St.  Petersburg|st petersburg|saint petersburg,sankt peterburg|RU|e5|2pl48|cuia|6hwl|ne:j64muz|1
St. Petersburg|st petersburg||US|jp|h5ix|5ya1|-hpyi|ne:j64izf|1
Stamford|stamford||US|et|g0bs|8srp|-frfk|ne:j6428p|1
Standerton|standerton||ZA|15i|1l45|-5rv7|69m8|ne:j64bn1|1
Stanley|stanley||FK||1ph|-b2x4|-cedg|ne:j64mrz|1
Stans|stans||CH|181|5rn|a29o|1sop|ne:j63uh1|1
Stara Zagora|stara zagora||BG|1mw|32o7|93c7|5hpf|ne:j64i1n|1
Staraya Russa|staraya russa||RU|19p|qgv|cfho|6pxk|ne:j64bxp|1
Starorybnoye|starorybnoye||RU|1pq|a|flgy|mgn4|ne:j64ja3|1
Starsy Oskol|starsy oskol|stary oskol|RU|7q|4v4x|azu4|83z4|ne:j64c41|1
State College|state college||US|1cy|1vue|8qrl|-goru|ne:j6498d|1
Stavanger|stavanger||NO|1gv|3pl8|cn0k|17ts|ne:j64j4b|1
Stavropol|stavropol||RU|1mx|7s54|9nlw|8zx4|ne:j64lhv|1
Stawell|stawell||AU|1tx|5e7|-7xyc|uljk|ne:j64ih1|1
Steinbach|steinbach||CA|121|7i9|am2r|-kq0h|ne:j64gy5|1
Steinkjer|steinkjer||NO|18r|8p6|dpyj|2gqg|ne:j64bbp|1
Stepanakert|stepanakert||AZ|1vu|18ch|8j7w|a0qo|ne:j64hov|1
Stephenville|stephenville||CA|17t|5fy|aem8|-cjwi|ne:j64h77|1
Sterlitamak|sterlitamak||RU|74|5q73|bht8|bzsg|ne:j64j6l|1
Stettler|stettler||CA|29|48m|b7sy|-o5gx|ne:j647i7|1
Stillwater|stillwater||US|1ao|10s3|7qtm|-kszf|ne:j641vf|1
Stockholm|stockholm||SE|1n0|r3b4|cpyv|3vmi|ne:j64n0z|1
Stockton|stockton||US|bd|eosa|84vx|-pzvl|ne:j648g1|1
Stoeng Treng|stoeng treng|stung treng|KH|1mu|mw1|2wce|mpp8|ne:j63zdn|1
Stoke|stoke|stoke on trent|GB|1n2|8djl|bcyc|-gtk|ne:j64ajf|1
Stony Rapids|stony rapids||CA|1jo|48|cpay|-mom5|ne:j647hp|1
Stralsund|stralsund||DE|13h|1bco|bmzg|2t2w|ne:j64fz3|1
Strasbourg|strasbourg||FR|2f|9fhg|aeug|1nss|ne:j64jq5|1
Streaky Bay|streaky bay||AU|1m5|tg|-716f|srlx|ne:j64ifj|1
Strelka|strelka||RU|111|a|d9da|wmrq|ne:j64crz|1
Strezhevoy|strezhevoy||RU|1r3|yk0|d0mc|gmld|ne:j64bvj|1
Stuttgart|stuttgart||DE|5s|1r458|age0|1yzk|ne:j64jid|1
Subotica|subotica||RS|1k6|255s|9vh8|47uo|ne:j6473t|1
Suceava|suceava||RO|1n4|29ms|a7kp|5mm9|ne:j644rd|1
Suchboatar|suchboatar|sukhbaatar|MN|1jz|ip7|arqc|mrg0|ne:j63w7h|1
Sucre|sucre||BO|e1|4thi|-42x6|-dzjn|ne:j64mpj|1
Sudbury|sudbury|greater sudbury|CA|1av|3dsx|9yso|-hcqq|ne:j64l0p|1
Suez|suez||EG|4i|aw8f|6fiq|6z5n|ne:j64lr1|1
Suhar|suhar|sohar|OM|16|38s5|57z8|c5rk|ne:j64j8f|1
Suihua|suihua||CN|o5|5emt|9zsw|r7s8|ne:j64f1l|1
Suileng|suileng|suiling town|CN|o5|18l9|a4jw|r8r8|ne:j646ot|1
Suining|suining|suining sichuan|CN|1kv|ujjc|6jm1|mmaa|ne:j64kod|1
Sukabumi|sukabumi||ID|r4|5xa6|-1hbc|mwug|ne:j64dyz|1
Sukhothai|sukhothai|sukhothai thani|TH|1nf|7xg|3n9j|ldor|ne:j649u5|1
Sukhumi|sukhumi|sokhumi|GE|4|1qx6|97y0|8sig|ne:j64kst|1
Sukkur|sukkur||PK|1l6|8ycn|5xu8|er8m|ne:j64j53|1
Sullana|sullana||PE|1dv|3g2d|-11q8|-haj4|ne:j64az7|1
Sumbawanga|sumbawanga||TZ|1h2|1wsp|-1pf0|6rzc|ne:j64ao1|1
Sumbe|sumbe|ngunza|AO|ff|pod|-2ehw|2yv8|ne:j64l3b|1
Sumenep|sumenep||ID|r6|1tbk|-1i1t|oegw|ne:j64e0t|1
Sumqayt|sumqayt|sumqayit|AZ|1no|5zef|8p48|amy4|ne:j6483x|1
Sumter|sumter||US|1m7|1390|79qf|-h7x5|ne:j6490v|1
Sumy|sumy||UA|1np|6b7c|awxn|7gdd|ne:j64jyd|1
Sunbury|sunbury||AU|1tx|n39|-81w0|v0l8|ne:j64iix|1
Sunchales|sunchales||AR|1j9|9rj|-6moh|-d71u|ne:j64hih|1
Sunchon|sunchon||KP|1c0|8l4l|8g70|qzr2|ne:j6465x|1
Sunderland|sunderland||GB|1s2|9phi|brrk|-anc|ne:j644bp|1
Sundsvall|sundsvall||SE|1um|1kml|ddhd|3pm7|ne:j64leh|1
Sungai Petani|sungai petani||MY|u9|7omb|17ld|ljax|ne:j64bgj|1
Sungaipenuh|sungaipenuh|sungai penuh|ID|r0|2209|-fx3|lqdo|ne:j64fbt|1
Sunshine Coast|sunshine coast|sunshine coast region|AU|1fn|1itf|-5pv4|wsxw|ne:j64883|1
Suntar|suntar||RU|1hy|6nz|dbic|p7nj|ne:j64jcn|1
Sunyani|sunyani||GH|9w|1i8r|1kls|-i0w|ne:j63xy7|1
Superior|superior||US|1vm|la4|a0i4|-jqof|ne:j64955|1
Supham Buri|supham buri|suphan buri|TH|1nq|157b|33nq|lglm|ne:j63uzf|1
Sur|sur||OM|4k|1iwg|4u72|crdg|ne:j64kft|1
Surabaya|surabaya|surabaja|ID|r6|1oz7s|-1jx5|o5z5|ne:j64mwb|1
Surakarta|surakarta||ID|r5|bwh8|-1mde|nr4q|ne:j64lpz|1
Surat|surat||IN|fq|2aci8|4jlf|fm0t|ne:j64myz|1
Surat Thani|surat thani||TH|1nr|3dmj|1ylp|laih|ne:j64lel|1
Surgut|surgut||RU|uq|8kn4|d4on|fqju|ne:j64met|1
Surigao|surigao|surigao city|PH|gs|1vrs|23hv|qwa0|ne:j64cln|1
Surin|surin||TH|1ns|1c94|36v8|m6jn|ne:j649xp|1
Surt|surt|sirte|LY|1nu|2quz|6otg|3k0c|ne:j64ksj|1
Susques|susques||AR|rr|ud|-50on|-e8zl|ne:j647w1|1
Susuman|susuman||RU|111|5on|dgft|vr9g|ne:j64jdj|1
Suva|suva||FJ|cd|3rc7|-3vwy|128v5|ne:j64mkl|1
Suwon|suwon|suweon|KR|mv|n3sg|7zhx|r809|ne:j64j2l|1
Suzhou|suzhou|suzhou anhui|CN|36|163fk|77jx|p2ll|ne:j64lpf|1
Suzhou|suzhou|suzhou jiangsu|CN|re|zd5c|6pj4|pup1|ne:j64l7d|1
Svay Rieng|svay rieng||KH|1nx|ihg|2dhs|mod6|ne:j63zfl|1
Svea Station|svea station|svea|AQ||a|-fzhh|-2ejr|ne:j64ivl|1
Svendborg|svendborg||DK|1o2|mik|bsxc|29x3|ne:j64ghl|1
Svetogorsk|svetogorsk||RU|ym|n8j|d3gl|674p|ne:j64by3|0
Svobodnyy|svobodnyy|svobodny|RU|2t|1d38|b0ni|rgo0|ne:j64jal|1
Svolvær|svolvaer||NO|18t|38l|emhp|34eb|ne:j64j2z|1
Swakopmund|swakopmund||NA|iq|mr7|-4uwx|345i|ne:j64ki1|1
Swan Hill|swan hill||AU|1tx|75o|-7kok|urk8|ne:j64iit|1
Swansea|swansea||GB|1o0|6b43|b2do|-uh8|ne:j644e3|1
Swellendam|swellendam||ZA|1vf|aju|-7ahw|4dn0|ne:j64biv|1
Swift Current|swift current||CA|1jo|bi2|arzp|-n3j6|ne:j64gyt|1
Sydney|sydney||AU|17q|2r8j4|-79pp|wejc|ne:j64n47|1
Sydney|sydney||CA|19o|syq|9vg5|-cwco|ne:j64m2j|1
Syktyvkar|syktyvkar||RU|vt|4y66|d7rs|aw4o|ne:j64j7b|1
Sylhet|sylhet||BD|1o3|52vc|5c5o|jowg|ne:j6487v|1
Syracuse|syracuse||US|17s|e78x|986c|-gbks|ne:j64lbp|1
Syzran|syzran||RU|1ib|423e|be9g|ae2o|ne:j645jx|1
Szczecin|szczecin||PL|1va|8qo3|bg70|3444|ne:j64df3|1
Szeged|szeged||HU|fc|40vp|9wvc|4bh8|ne:j64anf|1
Székesfehérvár|szekesfehervar||HU|jh|33cv|a45n|3y1d|ne:j644oj|1
Szekszárd|szekszard||HU|1r1|qda|9xlc|40e2|ne:j63u65|1
Szolnok|szolnok||HU|rx|2cb1|a43c|4bpe|ne:j64ann|1
Szombathely|szombathely||HU|1te|2ci6|a4e5|3kb3|ne:j644nx|1
Tabora|tabora||TZ|1og|351b|-12qg|7134|ne:j64kib|1
Tabriz|tabriz||IR|hv|uaa0|85w2|9x8x|ne:j64lyv|1
Tabuk|tabuk||SA|1oh|bqt1|630e|7u26|ne:j64lfp|1
Tacheng|tacheng||CN|1vs|12f8|a0q4|hs1o|ne:j64jiv|1
Tacloban|tacloban||PH|yp|601y|2et4|qsi8|ne:j64clb|1
Tacna|tacna||PE|1oi|604i|-3uw0|-f21w|ne:j64mc5|1
Tacoma|tacoma||US|1ux|ffgc|a4a9|-q9by|ne:j64ixd|1
Tacuarembó|tacuarembo|rivera|UY|1oj|15vp|-6soc|-bzy0|ne:j640z5|1
Tadjoura|tadjoura||DJ|1ok|h4h|2ix5|970o|ne:j63xb7|1
Tadmur|tadmur||SY|oq|16iv|7elc|87e9|ne:j649g1|1
Taedong|taedong||KP|1bz|1gc|8pej|qvz9|ne:j64dj3|1
Taganrog|taganrog||RU|1h1|5zbk|a4fg|8cb4|ne:j645e7|1
Tagum|tagum||PH|g5|56u|1kyl|qyox|ne:j64clj|1
Tahoua|tahoua||NE|1op|2hh0|36yw|14l3|ne:j64leb|1
Taian|taian|tai an,taian shandong|CN|1ke|ywy0|7rc3|p3ot|ne:j64jm5|1
Taibao|taibao||TW|db|r08|50xw|pshx|ne:j640vb|1
Taichung|taichung|t aichung|TW|1oq|1kcsr|56cx|pv6p|ne:j64m7x|1
Tailai|tailai||CN|o5|1mmw|9xy8|qg8k|ne:j64f27|1
Tainan|tainan|t ainan|TW|1or|147rs|4xgw|prgw|ne:j64l6d|1
Taipei|taipei||TW|1os|43wa9|5d6e|q20z|ne:j64n2n|1
Taiping|taiping||MY|1d0|52xz|11je|ll5s|ne:j64kk7|1
Taitung|taitung|taitung city|TW|1ot|3r14|4vky|pyq0|ne:j64l6f|1
Taiyuan|taiyuan|taiyuan shanxi|CN|1kg|1qfoo|849e|o4dz|ne:j64mx1|1
Taizhou|taizhou||CN|re|d4hw|6yp4|pp5k|ne:j64ewv|1
Taizz|taizz|ta izz|YE|1oe|g3h4|2wzk|9fsn|ne:j64lc5|1
Tajarhi|tajarhi|tegerhi tajirhi|LY|15r|15o|581k|33no|ne:j64dcp|1
Tak|tak||TH|1ov|pkq|3ma7|l8vx|ne:j649un|1
Takamatsu|takamatsu||JP|sc|75vz|7d07|sqao|ne:j646mz|1
Takaoka|takaoka||JP|1r9|3n8d|7uy4|td3k|ne:j646p5|1
Takéo|takeo|takev|KH|1ov|bs0|2cr2|mgih|ne:j64hr1|1
Taksimo|taksimo||RU|ah|7zr|c2nn|omhw|ne:j64cof|1
Talara|talara||PE|1dv|24g2|-zc8|-hf5s|ne:j64k8x|1
Talas|talas||KG|1ox|r50|942o|fhfh|ne:j64bfd|1
Talca|talca||CL|139|48dj|-7lkm|-fd0c|ne:j64krh|1
Talcahuano|talcahuano||CL|ay|66a2|-7vb3|-fo67|ne:j646x1|1
Taldyqorghan|taldyqorghan|taldykorgan|KZ|2e|1w70|9n80|gsxs|ne:j64jsf|1
Talkeetna|talkeetna||US|26|ty|dcw6|-w692|ne:j643r3|1
Tall Afar|tall afar|tal afar|IQ|189|33gx|7sog|93jm|ne:j64fwf|1
Tallahassee|tallahassee||US|jp|4qp2|6iyc|-i2b4|ne:j64lb1|1
Tallinn|tallinn||EE|nq|8g14|cqlf|5asw|ne:j64mjh|1
Taloqan|taloqan||AF|1ow|1dkw|7ves|ewko|ne:j63z91|1
Taloyoak|taloyoak||CA|19z|li|ewit|-k1ph|ne:j64m23|1
Taltal|taltal||CL|3d|7qa|-5fzk|-f3r0|ne:j64kqz|1
Tamale|tamale||GH|19d|7q83|20j8|-6hc|ne:j64fe1|1
Tamanrasset|tamanrasset||DZ|1oy|1mn4|4vt6|16m4|ne:j64mqv|1
Tamazunchale|tamazunchale||MX|1in|1k31|4k4g|-l66v|ne:j64cxd|1
Tambacounda|tambacounda||SN|1p0|1wu4|2ybw|-2xk0|ne:j64b6v|1
Tambov|tambov||RU|1p1|6gmi|bav8|8voc|ne:j64j6j|1
Tame|tame||CO|41|mgb|1duj|-fdjs|ne:j64eb3|1
Tampa|tampa|tampa st petersburg|US|jp|1dlhs|5znl|-ho9q|ne:j64mtl|1
Tampere|tampere||FI|1du|5k27|d6jc|5398|ne:j64lxz|1
Tampico|tampico|ciudad madero tamaulipas|MX|1oz|if4r|4s2g|-kz64|ne:j64mg5|1
Tamuín|tamuin||MX|1in|bdo|4plo|-l5yk|ne:j64cx7|1
Tamworth|tamworth||AU|17q|tqv|-6nzm|wchf|ne:j64k5b|1
Tan An|tan an||VN|zk|2y3e|29a1|mt47|ne:j64a1d|1
Tan Tan|tan tan||MA|ml|1e1w|63dc|-2dnc|ne:j64dlj|1
Tanacross|tanacross||US|26|3s|dl35|-uq2g|ne:j649l1|1
Tanana|tanana||US|26|8k|dyvb|-wlg4|ne:j643ut|1
Tandil|tandil||AR|e6|28hx|-7zyo|-coek|ne:j64k2v|1
Tanga|tanga||TZ|1p4|4tik|-134c|8dmc|ne:j64kih|1
Tangail|tangail||BD|gh|3v00|5744|j9ts|ne:j6484f|1
Tangier|tangier||MA|1p5|g2r0|7ntt|-1907|ne:j64kdb|1
Tangshan|tangshan|tangshan hebei|CN|o3|149ug|8hrb|pbz8|ne:j64jl1|1
Tanjung Pandan|tanjung pandan|tanjungpandan|ID|6k|1c4m|-l7w|n2ms|ne:j64lq3|1
Tanjungpinang|tanjungpinang|tanjung pinang|ID|ug|4uwa|72o|me3u|ne:j64epd|1
Tanta|tanta||EG|1c|8of9|6lkw|6n74|ne:j64efn|1
Taonan|taonan||CN|rj|2hz7|9prs|qbdk|ne:j64eyj|1
Taoudenni|taoudenni||ML|1qj|2bv|4uwa|-uqi|ne:j64kqj|1
Taoyuan|taoyuan||TW|1p7|apsw|5ctd|q01j|ne:j640vp|1
Tapachula|tapachula||MX|da|4qxd|36yw|-jryk|ne:j64jel|1
Tara|tara||RU|1at|ktm|c712|fxwm|ne:j64j7z|1
Tarabuco|tarabuco||BO|e1|1vg|-43zs|-dwxb|ne:j647qv|1
Ṭarābulus|tarabulus|tripoli|LB|195|bcy8|7dlo|7orc|ne:j64ksv|1
Tarakan|tarakan||ID|sl|44z1|pgo|p7nu|ne:j64mi3|1
Taranto|taranto||IT|3m|4bw1|8okc|3oy4|ne:j64ds3|1
Tarapoto|tarapoto||PE|1ip|q0|-1e8c|-ge4g|ne:j64j3f|1
Tarawa|tarawa|south tarawa|KI||m82|abq|1130g|ne:j64l5j|1
Taraz|taraz|dzhambul|KZ|1x6|7ocp|970o|fanm|ne:j64lz5|1
Tarbes|tarbes||FR|13w|16bq|99l9|n5|ne:j646tt|1
Taree|taree||AU|17q|y3a|-6u4g|woei|ne:j64icx|1
Târgoviște|targoviste||RO|hu|1w8j|9mqs|5gfy|ne:j63ubt|1
Târgu Jiu|targu jiu||RO|lj|22zf|9nki|4zl0|ne:j63uah|1
Tarija|tarija||BO|1pf|3ew5|-4m0v|-dvm4|ne:j64m4h|1
Tarin Kowt|tarin kowt|tarinkot|AF|1sq|7ps|6zst|e48b|ne:j63z75|1
Tarlac|tarlac|tarlac city|PH|1pg|3xx6|3bh2|pufe|ne:j64ckj|1
Tarma|tarma||PE|rt|13me|-2g1g|-g8c4|ne:j644vx|1
Tarragona|tarragona||ES|c5|2pg3|8tac|9n8|ne:j649ed|1
Tarsus|tarsus||TR|13q|j626|7wvo|7h4w|ne:j64aff|1
Tartagal|tartagal||AR|1i5|1axf|-4tzw|-dod0|ne:j647wf|1
Tartu|tartu||EE|1ph|2604|cihr|5q3f|ne:j64ko5|1
Tartus|tartus||SY|1pi|3hr8|7h66|7owi|ne:j649fn|1
Tarutung|tarutung||ID|1nn|109|fkb|l7mr|ne:j64dmj|1
Tash Komur|tash komur|tashkomur|KG|qx|i7e|8uzv|fhca|ne:j64bf7|1
Tashkent|tashkent||UZ|1pk|1at6o|8us0|euo2|ne:j64n0t|1
Tashtagol|tashtagol||RU|uc|hkr|bbce|itzp|ne:j64cgp|1
Tasiilaq|tasiilaq||GL||1et|e26r|-82dt|ne:j64l5l|1
Tasikmalaya|tasikmalaya||ID|r4|5t7r|-1kiu|n6zn|ne:j64klz|1
Tasiusaq|tasiusaq||GL||6y|fq4a|-c0k6|ne:j64iwh|1
Tatabánya|tatabanya||HU|vy|1ifh|a6wc|3y8a|ne:j63u5n|1
Tataouine|tataouine||TN|1pm|1ca9|72mo|28rf|ne:j63t57|1
Tatarsk|tatarsk||RU|19q|jem|bu3f|ga5t|ne:j64ci3|1
Tatuí|tatui||BR|1o6|207g|-5064|-a9ag|ne:j64811|1
Tatvan|tatvan||TR|8j|1khy|894a|928w|ne:j644i1|1
Tauá|taua||BR|ca|mis|-1aaj|-8n18|ne:j64gut|1
Taubaté|taubate||BR|1o6|8ne0|-4xmb|-9rjk|ne:j64hjf|1
Taunggyi|taunggyi||MM|1kd|3fjn|4gcs|ksr0|ne:j6403p|1
Taungoo|taungoo||MM|5z|2aip|427f|knyr|ne:j64ipn|1
Taupo|taupo||NZ|56|hfs|-8ak2|11qmb|ne:j64n5j|1
Tauranga|tauranga||NZ|7h|2lr0|-82v8|11r7k|ne:j64n5l|1
Tavda|tavda||RU|1nz|ugo|cfy1|dzjb|ne:j64ca1|1
Tawau|tawau||MY|1hg|6kgu|wye|p9ow|ne:j64kkp|1
Taxco|taxco||MX|mm|1529|3zag|-lco8|ne:j64d15|1
Tây Ninh|tay ninh||VN|1s5|2pia|2fda|mr1a|ne:j63t9j|1
Tayshet|tayshet||RU|qg|149k|bzjh|l02t|ne:j64j93|1
Tayynsha|tayynsha|tajynsha|KZ|192|a58|bjht|eyau|ne:j64g31|1
Taza|taza||MA|1pr|4a1d|7c1o|-v0o|ne:j64br5|1
Tazovsky|tazovsky|tazovskiy|RU|1vz|4m5|egkr|gv94|ne:j64j71|1
Tbilisi|tbilisi|t bilisi|GE|1ps|nkrk|8xyu|9llc|ne:j64mlt|1
Tchibanga|tchibanga||GA|1a2|exx|-m1m|2d32|ne:j63xzt|1
Te Anau|te anau||NZ|1mr|1fl|-9qd6|zyfl|ne:j64n71|1
Tébessa|tebessa|tbessa|DZ|1od|3oim|7l88|1qnk|ne:j64i1b|1
Tebingtinggi|tebingtinggi|tebing tinggi|ID|1nn|5qtn|pp4|l8w4|ne:j64dmn|1
Tecoman|tecoman||MX|eh|1ygp|41zo|-m9jk|ne:j64cxv|1
Tecpan|tecpan|tecpan de galeana|MX|mm|bam|3p3o|-lkuo|ne:j645xz|1
Tecuala|tecuala||MX|176|bih|4suc|-mlqg|ne:j64czb|1
Teeli|teeli|teli|RU|1ry|2vo|axrx|jc8t|ne:j64jab|1
Tefé|tefe||BR|2q|13ot|-pxc|-dv88|ne:j64kvv|1
Tegal|tegal||ID|r5|52xo|-1h08|ndz4|ne:j64dzj|1
Tegucigalpa|tegucigalpa||HN|js|k9xs|30ts|-iozn|ne:j64mbb|1
Tehran|tehran||IR|1pt|4oqug|7n9f|b0s0|ne:j64n27|1
Tehuacan|tehuacan||MX|1ez|56ad|3yd4|-kve0|ne:j64d0f|1
Tehuantepec|tehuantepec|santo domingo tehuantepec|MX|1a6|x08|3i04|-kess|ne:j64jed|1
Tejen|tejen||TM|s|1fxa|80ey|cysg|ne:j6443p|1
Tekax|tekax||MX|1wg|hli|4bv4|-j4w0|ne:j645zz|1
Tekirdağ|tekirdag||TR|1pu|2mcv|8sad|5w9o|ne:j64aef|1
Tel Aviv|tel aviv|tel aviv jaffa,tel aviv yafo|IL|1pv|1up8g|6vjn|7g9t|ne:j64myh|1
Telêmaco Borba|telemaco borba||BR|1ch|19fk|-57qb|-aul4|ne:j647bx|1
Télimélé|telimele||GN|va|ndz|2c56|-2sn2|ne:j63ygz|1
Teller|teller||US|26|2b|dzks|-znnc|ne:j643ph|1
Telsen|telsen||AR|dx|dw|-935o|-ecl8|ne:j64hav|1
Teluk Intan|teluk intan||MY|1d0|26fv|uyf|lnka|ne:j64bgb|1
Telukbutun|telukbutun||ID|ug|3w|wje|n6vk|ne:j64eph|1
Tema|tema||GH|m4|4h9k|17is|2s|ne:j64fff|1
Temirtau|temirtau||KZ|1fc|3nmw|aqay|fn02|ne:j64js1|1
Temple|temple||US|1q4|1b6x|6nzh|-kv9a|ne:j648vh|1
Temuco|temuco||CL|xd|5p65|-8auc|-fk14|ne:j64jqf|1
Tena|tena||EC|1rw|o0m|-7k4|-godw|ne:j64e4j|1
Tengchong|tengchong|tengyue|CN|1wj|2p9m|5d5p|l3ru|ne:j646k5|1
Tenkodogo|tenkodogo||BF|9c|tek|2iwc|-2up|ne:j64iof|1
Tennant Creek|tennant creek||AU|19i|301|-47mc|srhs|ne:j64k3x|1
Tenosique|tenosique||MX|1of|p0f|3qvo|-jlh8|ne:j64d0t|1
Teófilo Otoni|teofilo otoni||BR|141|262a|-3tvw|-8w7s|ne:j64kx1|1
Tepelenë|tepelene||AL|l8|983|8mtt|4akt|ne:j63yuj|1
Tepic|tepic||MX|176|6tz1|4lxq|-mh9c|ne:j64cz1|1
Terbyas|terbyas||RU|1hy|a|dsq9|pu59|ne:j64jc5|1
Teresina|teresina||BR|1do|jfug|-13ar|-963w|ne:j64m11|1
Termiz|termiz|termez|UZ|1nt|3t3r|7zah|ef2x|ne:j64j0v|0
Ternate|ternate||ID|11l|40ox|64a|raqm|ne:j64lnz|1
Ternopil|ternopil||UA|1q1|58v4|am80|5he5|ne:j649nv|1
Terrace|terrace||CA|9t|f03|boiw|-rk5l|ne:j647iz|1
Terre Haute|terre haute||US|q5|1kic|8giy|-iqhn|ne:j642on|1
Tessalit|tessalit||ML|v3|4mo|4bvi|8eg|ne:j64kqn|1
Tessenei|tessenei|teseney|ER|kj|brr|38lc|7uun|ne:j64ejt|1
Tete|tete||MZ|1q2|2rs4|-3gro|773s|ne:j64lgt|1
Tetovo|tetovo||MK|1q3|2jx8|9058|4ht1|ne:j6460x|1
Texarkana|texarkana||US|49|1lf2|761h|-k5lj|ne:j648nj|1
Texas City|texas city||US|1q4|1hy2|6axp|-kcqk|ne:j6424f|1
Teyateyaneng|teyateyaneng||LS|81|3y3|-68y2|5y56|ne:j63ws3|1
Teziutlán|teziutlan||MX|1ez|3t6s|48xo|-kv8g|ne:j64d0j|1
Tezpur|tezpur||IN|4o|19er|5pia|jw1s|ne:j64fl3|1
Thái Bình|thai binh||VN|1q6|4i1c|4dsn|msgy|ne:j63tdd|1
Thái Nguyên|thai nguyen||VN|1qc|apsw|4mo0|mol8|ne:j64j17|1
Thakhek|thakhek|muang khammouan|LA|up|1ncw|3qcg|mgx5|ne:j64dht|1
Thames|thames||NZ|1uq|57o|-7yk8|11mtp|ne:j64n6n|1
Thanh Hóa|thanh hoa||VN|1q7|48fj|48xk|mocw|ne:j64j1b|1
Thanjavur|thanjavur||IN|1p2|4pf7|2b3s|gyq4|ne:j64gf3|1
Thargomindah|thargomindah||AU|1fn|5n|-601s|utp3|ne:j64k6j|1
The Hague|the hague||NL|1xh|u4vk|b5uo|wy4|ne:j64lg1|1
The Pas|the pas||CA|121|4o7|bj92|-lp4d|ne:j64kyt|1
Theodore|theodore||AU|1fn|6u|-5cif|w61t|ne:j64ij5|1
Thermopolis|thermopolis||US|1vp|2np|9crw|-n6zn|ne:j648nd|1
Thessalon|thessalon||CA|1av|14o|9wv8|-hwoc|ne:j647k3|1
Thessaloniki|thessaloniki||GR|ue|hqw0|8q11|4wkf|ne:j64mln|1
Thiès|thies||SN|1qa|6a2x|36a0|-3mms|ne:j64b6l|1
Thika|thika||KE|cd|24my|-80s|7y6s|ne:j64bkb|1
Thimphu|thimphu||BT|1q9|2450|5vze|j7nq|ne:j64mr3|1
Thiruvananthapuram|thiruvananthapuram||IN|uh|kg40|1tln|ghqh|ne:j64lvb|1
Thohoyandou|thohoyandou||ZA|z5|5s3v|-4x30|6j6o|ne:j64kct|1
Thompson|thompson||CA|121|alb|by63|-kz56|ne:j64m1f|1
Thongwa|thongwa|thongwa township|MM|1w1|14i8|3la3|koqx|ne:j64ipt|1
Three Springs|three springs||AU|1ve|5a|-6bvp|ot4s|ne:j64k4n|1
Thu Dau Mot|thu dau mot||VN|av|58hh|2cmz|muxr|ne:j63te3|1
Thunder Bay|thunder bay||CA|1av|24na|adta|-j4um|ne:j64mon|1
Thung Song|thung song||TH|16j|lrz|1qx0|ldie|ne:j649t1|1
Tianjin|tianjin||CN|1qe|49w4g|8dy0|p4b1|ne:j64mxh|1
Tianshui|tianshui||CN|kg|q97s|7ezo|mp9o|ne:j64lov|1
Tiarat|tiarat|tiaret|DZ|1qf|3y4j|7kzw|a6o|ne:j64i0j|1
Tibati|tibati||CM|d|rgl|1dwe|2ph9|ne:j64hn1|1
Ticul|ticul||MX|1wg|njr|4des|-j6tg|ne:j64d3n|1
Tidjikdja|tidjikdja|tidjikja|MR|1oo|ff1|3z4s|-2g3a|ne:j64khf|1
Tidore|tidore||ID|11l|1arn|5dg|rbaw|ne:j64dmt|1
Tieli|tieli||CN|o5|2clg|a29s|rg1g|ne:j64f2x|1
Tieling|tieling||CN|ys|7acg|92e4|qjeg|ne:j64euj|1
Tierra Amarilla|tierra amarilla||CL|4w|9y0|-5w1c|-f2a8|ne:j646uz|1
Tijuana|tijuana||MX|62|xaaw|6ysc|-p3er|ne:j64mfz|1
Tikhoretsk|tikhoretsk||RU|wb|1doj|9tsz|8lpd|ne:j64c4z|1
Tikhvin|tikhvin||RU|ym|1bwb|cs80|76lk|ne:j64bxz|1
Tikrit|tikrit||IQ|1i1|17nz|7eya|9d0i|ne:j64fwl|1
Tiksi|tiksi||RU|1hy|4ec|fcod|rm3i|ne:j64mfv|1
Tillabéri|tillaberi||NE|17x|ev2|31ns|b7n|ne:j64awn|1
Tillamook|tillamook||US|1b3|6a9|9qqg|-qjkp|ne:j641k5|1
Timaru|timaru||NZ|bp|kzk|-9ikk|10pbd|ne:j64n5n|1
Timashevsk|timashevsk|timashyovsk|RU|wb|xyw|9s1j|8chw|ne:j64c4v|1
Timbaúba|timbauba||BR|1d4|18e6|-1lv8|-7kj4|ne:j64hkp|1
Timbedra|timbedra||MR|om|6t|3he0|-1r0i|ne:j64d5z|1
Timbuktu|timbuktu||ML|1qj|1h54|3lde|-n9y|ne:j64mkp|1
Timika|timika||ID|1cc|k2t|-z3s|tc90|ne:j64do5|1
Timimoun|timimoun||DZ|j|11zp|69l9|230|ne:j64hxt|1
Timiryazevskiy|timiryazevskiy|timiryazevskoe|RU|1r3|5ji|c3we|i74c|ne:j64bvb|1
Timișoara|timisoara||RO|1qk|6r3h|9t2s|4jre|ne:j64axn|1
Timmiarmiut|timmiarmiut||GL|vv|a|deid|-91qv|ne:j64jqn|1
Timmins|timmins||CA|1av|qzi|adyy|-hfkl|ne:j64m2b|1
Timon|timon|teresina|BR|12a|4cr9|-13gu|-96le|ne:j6474n|1
Tindouf|tindouf||DZ|1ql|e3i|5xja|-1qva|ne:j64l41|1
Tingo María|tingo maria||PE|pb|1515|-1zog|-gacc|ne:j64b0p|1
Tinogasta|tinogasta||AR|c6|gb|-60ka|-ehci|ne:j647vn|1
Tirana|tirana||AL|hr|j6uu|8uvv|48x9|ne:j64mq5|1
Tiraspol|tiraspol||MD|7s|3d54|a1ir|6cpc|ne:j64bsd|1
Tirgu Mures|tirgu mures|targu mures|RO|15p|37ax|9z8u|59hm|ne:j64ay1|1
Tiruchirappalli|tiruchirappalli|trichinopoly,trichy|IN|1p2|kdso|2bfb|gv5s|ne:j64lzt|1
Tirunelveli|tirunelveli||IN|1p2|bmd4|1vd4|gngk|ne:j64gev|1
Tirupati|tirupati|tirupathi|IN|33|65h7|2xbs|h0t4|ne:j64fhz|1
Tiruppur|tiruppur|tirupur|IN|1p2|dxjk|2dhw|gkok|ne:j64gfh|1
Tiruvannamalai|tiruvannamalai|tiruvannaamalai|IN|1p2|2yo3|2mlo|gyc8|ne:j64ge7|1
Titusville|titusville||US|jp|14d3|64rv|-hbim|ne:j648yb|1
Tizi-Ouzou|tizi ouzou||DZ|1qo|3340|7v9p|v7x|ne:j63zhb|1
Tizimín|tizimin||MX|1wg|weh|4j1k|-iw64|ne:j64d3b|1
Tiznit|tiznit||MA|1m3|18ix|6d8w|-235k|ne:j64brv|1
Tlaxcala|tlaxcala||MX|1qp|assm|452o|-l1y4|ne:j645wz|1
Tlaxiaco|tlaxiaco||MX|1a6|gi7|3p9c|-kxpc|ne:j64d05|1
Tlimcen|tlimcen|tlemcen|DZ|1qq|4xap|7h7s|-a6o|ne:j64hy1|1
Tmassa|tmassa|tmassah|LY|15r|dw|5ng2|3dww|ne:j64lxb|1
Toamasina|toamasina||MG|1qr|4i7m|-3wai|al7m|ne:j64klj|1
Tobol|tobol||KZ|1fh|5ir|bamc|detx|ne:j64g0t|1
Tobolsk|tobolsk||RU|1s3|2ft4|ch2m|emqg|ne:j64j81|1
Tocache|tocache||PE|1iq|med|-1r44|-gefk|ne:j64b13|1
Tocantinópolis|tocantinopolis||BR|1qs|6r2|-1crg|-a5w8|ne:j64gp3|1
Toconao|toconao||CL|3d|ai|-4yvp|-ekti|ne:j64fr7|1
Tocopilla|tocopilla||CL|3d|ivg|-4qg4|-f1l8|ne:j64kqt|1
Tofino|tofino||CA|9t|19z|aiui|-qz5p|ne:j64895|1
Togiak|togiak||US|26|6k|cnsg|-ydhj|ne:j64jxl|1
Toguchin|toguchin||RU|19q|gvy|bu7t|i329|ne:j645lx|1
Tokar|tokar||SD|1ga|1khe|3y8d|835h|ne:j64k83|1
Tokat|tokat||TR|1qu|2s2u|8n04|7u4e|ne:j63tqj|1
Tokmak|tokmak|tokmok|KG|8e|2f30|96h7|g4we|ne:j6455p|1
Tokoroa|tokoroa||NZ|1uq|aau|-86xx|11p0x|ne:j64n75|1
Toktogul|toktogul||KG|qx|k5f|8z62|fmsc|ne:j64bf3|1
Tokushima|tokushima||JP|1qw|9ieo|7av6|su7p|ne:j646n3|1
Tokyo|tokyo||JP|1qx|l8ns0|7nd2|tybb|ne:j64n3t|1
Tôlanaro|tolanaro||MG|1qz|cz6|-5d3w|a2ks|ne:j64kln|1
Toledo|toledo||US|1aj|a2lg|8xj0|-hwwo|ne:j64jwb|1
Toledo|toledo||ES|c4|1ll4|8jm6|-uzr|ne:j649cz|1
Toliara|toliara||MG|1qz|2gzb|-5080|9d44|ne:j64lpx|1
Toltén|tolten|nueva tolten|CL|xc|1rp|-8eli|-fowr|ne:j646w5|1
Tolú|tolu||CO|1n6|l4u|21ku|-g748|ne:j64eav|1
Toluca|toluca|toluca de lerdo|MX|161|wtbs|4563|-ld2n|ne:j64d1t|1
Tolyatti|tolyatti||RU|1ib|f2cf|bgno|am6c|ne:j64cct|1
Tom Price|tom price||AU|1ve|23n|-4v3r|p8wb|ne:j64i7n|1
Tomah|tomah||US|1vm|a11|9fe3|-jebz|ne:j642zn|1
Tomakomai|tomakomai||JP|oo|3qvq|953c|uc7g|ne:j64f4x|1
Tombstone|tombstone||US|48|17m|6sp7|-nla5|ne:j648fb|1
Tômbua|tombua|tombwa|AO|16n|uv4|-3dww|2jig|ne:j64l3n|1
Tomsk|tomsk||RU|1r3|bh6f|c3x2|i7o6|ne:j64me5|1
Tonantins|tonantins||BR|2q|3ip|-m5z|-ej5v|ne:j64kvt|1
Tongchuan|tongchuan||CN|1k8|61si|7iog|nda4|ne:j64jjd|1
Tonghua|tonghua||CN|rj|l0b|8xls|qyak|ne:j646mf|1
Tongliao|tongliao||CN|17d|iy3k|9cl7|q7fc|ne:j64ltf|1
Tongling|tongling||CN|36|c2a8|6mtc|p8so|ne:j64dxh|1
Tongren|tongren||CN|mp|2j9u|5xl0|ne1w|ne:j64dvx|1
Tongue|tongue|tougue|GN|xp|jp7|2g9s|-2i1o|ne:j63ydd|1
Tonk|tonk||IN|1fz|3w86|5ls1|g8ss|ne:j64g9j|1
Tonopah|tonopah||US|17j|2il|85q6|-p4jm|ne:j641hn|1
Tønsberg|tonsberg||NO|1tr|u0y|cpa8|28eq|ne:j63vqh|1
Toowoomba|toowoomba||AU|1fn|1zls|-5wot|wkhv|ne:j64k6f|1
Topeka|topeka||US|t2|2tx7|8db8|-ki70|ne:j64la3|1
Topki|topki||RU|uc|j1c|bujm|icks|ne:j64ch3|1
Torbat-e Jam|torbat e jam||IR|1g8|28oy|7js9|czox|ne:j64g8n|1
Toronto|toronto||CA|1av|33qdk|9d7f|-h0to|ne:j64n2d|1
Tororo|tororo||UG|1r4|37qo|5hc|7bno|ne:j64amf|1
Torreón|torreon||MX|eb|oips|5hbc|-m60b|ne:j64llt|1
Tórshavn|torshavn|thorshavn|FO|j6|b3y|damk|-1gmg|ne:j64ji7|1
Torzhok|torzhok||RU|1s1|11gi|c81f|7hwb|ne:j64c0d|1
Totness|totness||SR|f2|1at|19g8|-c2kg|ne:j649ad|1
Totonicapán|totonicapan||GT|1r6|1ht2|372s|-jkx8|ne:j63xkp|1
Tottori|tottori||JP|1r7|3awi|7lx8|srr1|ne:j64exv|1
Touba|touba||CI|5w|l80|1rw0|-1nag|ne:j63yjt|1
Tougan|tougan||BF|1m2|dkm|2sua|-nos|ne:j63zun|1
Touggourt|touggourt||DZ|1bn|2vcy|73eg|1arc|ne:j64l4f|1
Toulon|toulon||FR|1ew|7nzx|98tq|19o4|ne:j64fo1|1
Toulouse|toulouse||FR|13w|i5js|9cl7|b68|ne:j64jpz|1
Toumodi|toumodi|toumodi sakassou|CI|xr|u3h|1ek0|-12q6|ne:j63ylf|1
Tournavista|tournavista||PE|p2|e7|-1wx6|-g0fg|ne:j644ud|1
Tours|tours||FR|cg|5268|a5l8|5ef|ne:j64fp5|1
Tovuz|tovuz||AZ|1r8|9qq|8saq|9s2p|ne:j63z2l|1
Townsville|townsville||AU|1fn|2z7u|-44j7|vghg|ne:j64mrj|1
Toyama|toyama||JP|1r9|74ss|7v6g|tevg|ne:j646p1|1
Tozeur|tozeur||TN|1ra|uhc|79t4|1qqc|ne:j649eh|1
Tra Vinh|tra vinh||VN|1rb|2tcw|24ng|msh8|ne:j63tft|1
Trabzon|trabzon||TR|1rc|ge22|8s7c|8ihc|ne:j64j2h|1
Tralee|tralee||IE|uk|kcw|b7aj|-22z3|ne:j64671|1
Trancas|trancas||AR|1rr|18f|-5maf|-dzq9|ne:j647wt|1
Trang|trang||TH|1rd|3624|1mcy|lckw|ne:j649t5|1
Tranqueras|tranqueras||UY|1gq|5rm|-6oqo|-by64|ne:j640yn|1
Traralgon|traralgon||AU|1tx|e2a|-86r0|vems|ne:j64iht|1
Trat|trat||TH|1rh|gnq|2mf6|lyyq|ne:j63v5l|1
Traverse City|traverse city||US|13u|xbp|9lfo|-icny|ne:j649bp|1
Treinta y Tres|treinta y tres||UY|1ri|ld0|-74ek|-bnlk|ne:j6410f|1
Trelew|trelew||AR|dx|203m|-99pw|-e038|ne:j647pp|1
Trento|trento||IT|1rl|2b6o|9vk4|2dsw|ne:j64du5|1
Trenton|trenton||US|17o|7usx|8mbe|-g0q2|ne:j64izz|1
Trepassey|trepassey||CA|17t|b2|a0mi|-bfr5|ne:j64iu1|1
Tres Arroyos|tres arroyos||AR|e6|10dc|-882c|-cx1n|ne:j647tn|1
Três Lagoas|tres lagoas||BR|137|1oqg|-4gf0|-b32o|ne:j6475n|1
Treviso|treviso||IT|1tk|3st9|9se4|2mg0|ne:j64697|1
Trieste|trieste||IT|jv|4moz|9s8o|2yhc|ne:j64dtv|1
Trincomalee|trincomalee||LK|1rm|2bno|1u4a|hesq|ne:j63w3d|1
Trindade|trindade||BR|le|238x|-3kh0|-aly0|ne:j647rv|1
Trinidad|trinidad||BO|id|1t0j|-36ge|-dwrs|ne:j64m33|1
Trinidad|trinidad||UY|jo|g9x|-76ts|-c71u|ne:j63t1j|1
Trinidad|trinidad||US|ek|72c|7ytd|-medk|ne:j648jb|1
Tripoli|tripoli||LY|1ou|1ax1k|71st|2tp4|ne:j64myf|1
Tripoli|tripoli||GR|1cw|mcq|81f7|4soi|ne:j64ftz|1
Trnava|trnava||SK|1ro|1huh|ad76|3rsw|ne:j6452j|1
Trofimovsk|trofimovsk|trofimovskaya|RU|1hy|a|fk6l|r875|ne:j64cqz|1
Trois-Rivières|trois rivieres||CA|1fv|2kct|9xn0|-fjsr|ne:j64k27|1
Troitsk|troitsk||RU|d2|1rj6|blhd|d72u|ne:j64c7f|1
Troll Station|troll station|troll|AQ||18|-ffoj|jjp|ne:j64ivj|1
Trollhättan|trollhattan||SE|1uo|ydb|chlb|2mwo|ne:j64aub|1
Tromsø|tromso||NO|1rp|14gk|exb3|42jk|ne:j64mcv|1
Trondheim|trondheim||NO|1ob|35j7|dlbr|28dj|ne:j64mcx|1
Trout River|trout river||CA|17t|ck|alth|-cgfi|ne:j64h7v|1
Troyes|troyes||FR|cs|1blz|aczw|via|ne:j64fpz|1
Truc Giang|truc giang|ben tre|VN|5l|19v6|26z2|mssm|ne:j63tfh|1
Trujillo|trujillo||PE|xg|geer|-1qnk|-gxq0|ne:j64mc7|1
Trujillo|trujillo||VE|1rq|12up|20do|-f3io|ne:j648vl|1
Trujillo|trujillo||HN|el|7fy|3erk|-if9s|ne:j64a6n|1
Truth or Consequences|truth or consequences||US|17p|5ht|73ns|-mzkh|ne:j641ij|1
Tsau|tsau|tsao|BW|19b|135|-4bjw|4taw|ne:j64i55|1
Tsavo|tsavo||KE|ec|bi|-n0k|88t6|ne:j64bk1|1
Tsetserleg|tsetserleg||MN|46|fac|a6c1|lqsm|ne:j6466b|1
Tshabong|tshabong|tsabong|BW|ul|7gv|-5kov|4su8|ne:j64i51|1
Tshela|tshela||CD|70|tz1|-12cg|2rro|ne:j64f8z|1
Tshikapa|tshikapa||CD|tl|5qdi|-1dgk|4g9g|ne:j64kot|1
Tsiigehtchic|tsiigehtchic||CA|19k|4v|egbh|-so0s|ne:j647jv|1
Tskhinvali|tskhinvali||GE|1kk|tpi|91v9|9fba|ne:j646zb|1
Tsu|tsu||JP|13z|apsw|7fvn|t9db|ne:j64f4b|1
Tsumeb|tsumeb||NA|1be|bjj|-44gg|3sng|ne:j64ki7|1
Tsuruoka|tsuruoka||JP|1vx|250s|8am4|tyxq|ne:j64f6b|1
Tuapse|tuapse||RU|wb|24i1|9ge4|8df8|ne:j64c4f|1
Tuban|tuban||ID|r6|1mtu|-1h8j|o0l0|ne:j64e11|1
Tubarão|tubarao||BR|1j7|1z77|-63r4|-ai8o|ne:j647ct|1
Tubruq|tubruq|tobruk|LY|19|5nc7|6vj4|54vk|ne:j64ksn|1
Tucano|tucano||BR|60|o2r|-2cn4|-8bb0|ne:j64gwf|1
Tucson|tucson||US|48|hn14|6wid|-nrnb|ne:j64l9h|1
Tucumán|tucuman|san miguel de tucuman,san miguel de tucumnn|AR|1rs|hsfk|-5qwd|-dz8a|ne:j64m3d|1
Tucumcari|tucumcari||US|17p|43l|7jde|-m8cn|ne:j648l5|1
Tucupita|tucupita||VE|14j|13ri|1xwt|-dauw|ne:j6499z|1
Tucuruí|tucurui||BR|1ck|1mwh|-se8|-ann4|ne:j64kwl|1
Tuguegarao|tuguegarao||PH|b7|2gtd|3rwj|q391|ne:j64j8t|1
Tukchi|tukchi||RU|un|a|cana|twe0|ne:j64cr3|1
Tuktoyaktuk|tuktoyaktuk||CA|19k|pt|evx0|-sim4|ne:j64l0b|1
Tukuyu|tukuyu||TZ|13d|2qfm|-1zdc|77kg|ne:j64anx|1
Tula|tula||RU|1rt|ahou|bm7k|82cr|ne:j64j6h|1
Tula|tula|ciudad tula|MX|1oz|6zi|4xh0|-ldg0|ne:j64cxh|1
Tulare|tulare||US|bd|1750|7rdi|-pkv5|ne:j648ih|1
Tulcán|tulcan||EC|by|1s1k|6cc|-gns8|ne:j640k1|0
Tulcea|tulcea||RO|eu|1zcr|9ord|6673|ne:j644q5|1
Tulsa|tulsa||US|1ao|kaoi|7qpc|-kk78|ne:j64la7|1
Tuluá|tulua||CO|1t7|3jp9|vk8|-gc1g|ne:j64e9p|1
Tulun|tulun||RU|qg|13lu|bp11|ljyu|ne:j64j9f|1
Tumaco|tumaco|tumaco narino|CO|16z|1uwp|dys|-gw3o|ne:j64kmx|1
Tumakuru|tumakuru|tumkur|IN|th|8kc6|2uus|giwo|ne:j64kq3|1
Tumbes|tumbes||PE|1ru|2c9z|-rjo|-h8u0|ne:j64k8z|1
Tumby Bay|tumby bay||AU|1m5|1dr|-7dat|t60x|ne:j64ift|1
Tumen|tumen||CN|rj|24y1|97k4|rtp5|ne:j64jn1|1
Tumut|tumut||AU|17q|51a|-7kg8|vro8|ne:j64iav|1
Tunceli|tunceli||TR|1rv|mfa|8dtr|8h1h|ne:j63tv3|1
Tunduma|tunduma||TZ|13d|s7g|-1zn2|70w5|ne:j64ant|0
Tunduru|tunduru||TZ|1h5|go|-2dkg|80ck|ne:j64asb|1
Tunguskhaya|tunguskhaya||RU|1hy|a|dwrw|qufo|ne:j64cqj|1
Tunis|tunis||TN|1rx|1fphw|7vz0|26jp|ne:j64ma1|1
Tunja|tunja||CO|9g|3gjo|16ts|-fq4k|ne:j64e51|1
Tununak|tununak||US|26|9s|czhb|-zf4e|ne:j643nx|1
Tunuyán|tunuyan||AR|13o|hma|-76zy|-esjb|ne:j64hb3|1
Tupã|tupa||BR|1o6|1bv7|-4p7o|-attb|ne:j6480h|1
Tupelo|tupelo||US|149|rqs|7cc3|-j0ft|ne:j64907|1
Tupiza|tupiza||BO|1eg|m72|-4lfg|-e33k|ne:j64hw1|1
Túquerres|tuquerres||CO|16z|q7v|8es|-gmx3|ne:j646dh|1
Tura|tura||RU|j3|478|ds0h|lhj8|ne:j64j8x|1
Turangi|turangi||NZ|1uq|2i0|-8cu9|11ola|ne:j64n7p|1
Turbat|turbat||PK|6d|361b|5kjy|diny|ne:j64j4t|1
Turbo|turbo||CO|3c|12z0|1qi4|-gg4o|ne:j64e4x|1
Turgay|turgay|torgaj|KZ|1fh|42l|amx0|dlym|ne:j640q3|1
Turin|turin|torino|IT|1dr|zeow|9ns3|1n60|ne:j64jgb|1
Turkistan|turkistan||KZ|1md|234g|9a48|emnp|ne:j64jsp|1
Türkmenabat|turkmenabat|chardzhev|TM|cy|516p|8drw|dml4|ne:j64lcv|1
Türkmenbaşy|turkmenbasy|turkmenbashi|TM|69|1gp0|8kti|bcpt|ne:j64lcn|1
Turku|turku||FI|jl|3rrd|cygr|4rpy|ne:j64jrj|1
Turnovo|turnovo|veliko tarnovo|BG|1tj|14zf|98ge|5hyj|ne:j64i1x|1
Turpan|turpan||CN|1vs|dyz1|97ai|j402|ne:j64eoz|1
Turukhansk|turukhansk||RU|wc|3om|e40e|iuny|ne:j64j9z|1
Tuscaloosa|tuscaloosa||US|23|2lnh|74d7|-irhu|ne:j648x5|1
Tuticorin|tuticorin|thoothukudi|IN|1p2|9chq|1w20|gqus|ne:j64kuv|1
Tuxpam|tuxpam|tuxpan|MX|1tm|2c55|4hqc|-kvmc|ne:j64d2n|1
Tuxpan|tuxpan||MX|176|k5f|4p7s|-mk9o|ne:j64cyx|1
Tuxtla Gutiérrez|tuxtla gutierrez||MX|da|ab8o|3l8s|-jyr0|ne:j64mgd|1
Tuy Hòa|tuy hoa||VN|1dn|1hp8|2sxw|nfhk|ne:j63tdt|1
Tuyên Quang|tuyen quang||VN|1rz|s3y|4ock|mjta|ne:j63tbv|1
Tuymazy|tuymazy||RU|74|1h3x|bpc0|bib3|ne:j64c75|1
Tuzla|tuzla||BA|1s0|33da|9jr5|404w|ne:j64ion|1
Tver|tver||RU|1s1|8kt0|c6qg|7oxg|ne:j64lib|1
Tweed Heads|tweed heads||AU|17q|pih|-61gi|wwru|ne:j64i9j|1
Twin Falls|twin falls||US|pq|10ib|94ei|-oj6m|ne:j648dj|1
Tyler|tyler||US|1q4|2elx|6xmf|-kfcg|ne:j64juv|1
Tynda|tynda||RU|2t|st3|btq7|qq90|ne:j64jax|1
Tyumen|tyumen||RU|1s3|b4jz|c8w8|e1ms|ne:j64ljh|1
Tzaneen|tzaneen||ZA|z5|1fvx|-53sj|6gsk|ne:j64bnd|1
Ubá|uba||BR|141|23hg|-4iyk|-97ek|ne:j64gqb|1
Ubaitaba|ubaitaba||BR|60|lw7|-32c8|-8fh0|ne:j647fb|1
Uberaba|uberaba||BR|141|5l9n|-48mg|-a9zg|ne:j64kx3|1
Uberlândia|uberlandia||BR|141|c2ts|-41u0|-acj4|ne:j64m0l|1
Ubomba|ubomba|ubombo|ZA|wt|fo|-5wp9|6vk1|ne:j64bnv|1
Ubon Ratchathani|ubon ratchathani||TH|1s8|5vc5|39o4|mgvg|ne:j64k8t|1
Udachny|udachny|udachnyy|RU|1hy|bs2|e8iw|o399|ne:j64jct|1
Udaipur|udaipur||IN|1fz|a2g9|59tc|fswk|ne:j64jsn|1
Udine|udine||IT|jv|2jtt|9vh8|2u5s|ne:j64693|1
Udon Thani|udon thani||TH|1sb|5arj|3qao|m14l|ne:j649y7|1
Uelen|uelen|whalen ugelen|RU|dy|lk|e6g5|-10e9m|ne:j64kdv|1
Ufa|ufa||RU|74|lths|bqrz|c0e5|ne:j64mej|1
Uglegorsk|uglegorsk||RU|1hz|9rx|aiq9|ufxp|ne:j645qd|1
Uglich|uglich||RU|1w3|t44|cbv0|87r8|ne:j645cx|1
Ugolnye Kopi|ugolnye kopi||RU|dy|2lj|dvhh|12354|ne:j64lhx|1
Uíge|uige||AO|1t2|1aaw|-1mso|384k|ne:j64l3d|1
Uitenhage|uitenhage||ZA|i3|4wmo|-78ho|5fws|ne:j64bub|1
Ujjain|ujjain||IN|10u|b03q|4yxs|g8ss|ne:j64gdp|1
Ukhta|ukhta||RU|vt|26uj|dmfk|bi9w|ne:j64j7d|1
Ukiah|ukiah||US|bd|lh0|8e46|-qep9|ne:j648hv|1
Ulaan-Uul|ulaan uul||MN|hc|2vi|9i2x|nua5|ne:j64dhx|1
Ulaanbaatar|ulaanbaatar||MN|1sd|iyvc|a9qq|mwyj|ne:j64mgt|1
Ulaangom|ulaangom||MN|1t1|rmc|apo9|jqe2|ne:j64jfh|1
Ulan Hot|ulan hot|ulanhot|CN|17d|56na|9vk0|q5z4|ne:j64ltl|1
Ulan-Ude|ulan ude||RU|ah|7pzq|b3vu|n2fu|ne:j64lkn|1
Uliastay|uliastay|uliastai|MN|ht|67s|a8fw|kr1j|ne:j64jfb|1
Ulkan|ulkan||RU|qg|a|bzbw|n3nt|ne:j64cm3|1
Ulladulla|ulladulla||AU|17q|74y|-7krb|w918|ne:j64iaf|1
Ulm|ulm||DE|5s|3pgb|adgk|255s|ne:j64ekj|1
Ulsan|ulsan||KR|1se|mqo8|7man|rpsu|ne:j64j8l|1
Ulundi|ulundi||ZA|wt|g0h|-62lc|6qd0|ne:j64bnh|1
Ulyanovsk|ulyanovsk|ul yanovsk|RU|1sc|dqco|bn7o|adj8|ne:j64ljd|1
Uman|uman||UA|d3|1vmy|ag6v|6h3x|ne:j643y5|1
Umba|umba||RU|15q|4q8|eaim|7d0f|ne:j64j5v|1
Umeå|umea||SE|1ul|1oc5|doik|4c68|ne:j64k8d|1
Umm al Abid|umm al abid|umm al ahrar|LY|1hh|8c|5wbm|37zx|ne:j64dcv|1
Umm al Qaywayn|umm al qaywayn|umm al quwain|AE|1sg|y9n|5h9h|bwnh|ne:j64425|1
Umm Ruwaba|umm ruwaba||SD|194|170e|2rm8|6oqo|ne:j64ab3|1
Umtata|umtata|mthatha|ZA|i3|2yb0|-6ro8|6658|ne:j64kdh|1
Umuahia|umuahia||NG|3|5o7q|16oo|1lrg|ne:j63w4p|1
Unalakleet|unalakleet||US|26|kl|doum|-ygnd|ne:j649jh|1
Unalaska|unalaska||US|26|2r7|bjni|-zoys|ne:j64jxj|1
Uncia|uncia||BO|1ef|3n7|-3yik|-e9no|ne:j6485h|1
Upata|upata||VE|90|15f9|1pvw|-ddk4|ne:j6498v|1
Upernavik|upernavik||GL|1fb|vd|fl12|-c16x|ne:j64lwt|1
Upington|upington||ZA|19f|1j2l|-63lk|4jt8|ne:j64lgl|1
Upper Hutt|upper hutt||NZ|11q|u8w|-8tej|11ij6|ne:j64n4h|1
Uppsala|uppsala||SE|1so|2upp|ctvt|3s40|ne:j64k8f|1
Uranium City|uranium city||CA|1jo|2h|crma|-na3a|ne:j64kyv|1
Uray|uray||RU|uq|urq|cw1l|dvng|ne:j64cef|1
Urbana|urbana||US|pu|3362|8lho|-iwl6|ne:j6491v|1
Urgentch|urgentch|urgench|UZ|ux|37tq|8wog|czwg|ne:j64jyn|1
Urgut|urgut||UZ|1ic|24wr|8g0n|eezj|ne:j6445d|1
Urmia|urmia|orumiyeh|IR|1v1|cdgb|81l0|9n80|ne:j64713|1
Uroteppa|uroteppa|istarawshan|TJ|yl|3cul|8k1f|esf3|ne:j649sh|1
Uruapan|uruapan||MX|13v|5o43|45uk|-lvks|ne:j64cyt|1
Uruará|uruara||BR|1cd|a|-tjs|-bkwc|ne:j64go7|1
Urubamba|urubamba||PE|fk|5tg|-2unm|-fgge|ne:j644tj|1
Uruguaiana|uruguaiana||BR|1gl|2na0|-6dpc|-c8ic|ne:j64grx|1
Ürümqi|urumqi|rumqi,wulumqi|CN|1vs|24mhk|9e0m|irpv|ne:j64n1n|1
Uryupinsk|uryupinsk||RU|1ua|w4s|avrq|903j|ne:j64c3x|1
Urzhar|urzhar||KZ|hz|bfu|a3fe|hho0|ne:j64g41|1
Uşak|usak||TR|1sr|39y6|8agk|6b08|ne:j64ajx|1
Usakos|usakos||NA|iq|723|-4pqz|3c7s|ne:j64dkh|1
Ushtobe|ushtobe||KZ|2e|ft8|9p9p|gpmc|ne:j64g4b|1
Ushuaia|ushuaia||AR|1qh|18rw|-bqrg|-en30|ne:j64l21|1
Usinsk|usinsk||RU|vt|yq0|e4ny|caxa|ne:j64kfb|1
Usolye Sibirskoye|usolye sibirskoye||RU|qg|1ua4|bb4y|m7qa|ne:j64j95|1
Uspallata|uspallata||AR|13o|1ue|-6zhn|-ev2s|ne:j647q3|1
Ussuriysk|ussuriysk||RU|1eq|3d70|9dyo|sao8|ne:j64jbd|1
Ust-Ilimsk|ust ilimsk|ust ulimsk|RU|qg|25db|cfgc|lzx9|ne:j64lkb|1
Ust-Kamchatsk|ust kamchatsk||RU|sq|3t7|c1qv|ytcu|ne:j64jg3|1
Ust-Kut|ust kut||RU|qg|jl8|c602|mo1s|ne:j64j9j|1
Ust Kuyga|ust kuyga||RU|1hy|165|f097|t2ao|ne:j64cpv|1
Ust-Maya|ust maya||RU|1hy|2d2|cyhi|su55|ne:j64jbz|1
Ust-Nera|ust nera||RU|1hy|724|du76|uoxs|ne:j64ll3|1
Ust-Olenyok|ust olenyok|ust olensk|RU|1hy|a|fn96|po69|ne:j64jcl|1
Ust' Ordynskiy|ust ordynskiy|ust ordynsky|RU|1ss|b7u|bbnu|mfvc|ne:j640hx|1
Usti Nad Labem|usti nad labem||CZ|yt|20m1|aux2|30ne|ne:j640m7|1
Usulután|usulutan||SV|1su|141y|2uz8|-iycg|ne:j63wyp|1
Uthai Thani|uthai thani||TH|1sw|h57|3aor|lft4|ne:j649ut|1
Utica|utica||US|17s|294u|98kk|-g4i3|ne:j6497d|1
Utkholok|utkholok||RU|sq|a|cc28|xp7x|ne:j64dln|1
Utqiaġvik|utqiagvik||US|26|3cg|fa2y|-xlse|ne:j64mad|1
Utrecht|utrecht||NL|1sx|dpts|b60b|13i8|ne:j64bb3|1
Utsunomiya|utsunomiya||JP|1qt|eb8o|7u0s|tz8s|ne:j646pv|1
Uttaradit|uttaradit||TH|1sz|1n4m|3s1o|lgcs|ne:j649ub|1
Uummannaq|uummannaq||GL||103|f5by|-b66l|ne:j64l5z|1
Uvinza|uvinza||TZ|v6|1pzy|-13i4|6iho|ne:j64aq5|1
Uvira|uvira||CD|1nb|3nh3|-q04|68ug|ne:j64koz|1
Uyar|uyar||RU|wc|a5r|bymw|k7qp|ne:j64cnb|1
Uyo|uyo||NG|13|bw62|12n4|1okk|ne:j63w5h|1
Uyuni|uyuni||BO|1eg|9zf|-4dvc|-ebnw|ne:j6485j|1
Uzhgorod|uzhgorod|uzhhorod|UA|1re|38ds|af8c|4rok|ne:j643xp|1
Uzhur|uzhur||RU|wc|eto|bux8|j927|ne:j64cnf|1
Vaasa|vaasa||FI|1vg|17zq|divs|4mo0|ne:j64lxx|1
Vác|vac||HU|1d7|r8d|a8p9|43ms|ne:j64an5|1
Vacaria|vacaria||BR|1gl|17st|-63wk|-ax20|ne:j64gsn|1
Vadodara|vadodara|baroda|IN|fq|11mxs|4s5s|fon9|ne:j64l8j|1
Vadsø|vadso||NO|jm|3yr|f0va|6do9|ne:j64j4l|1
Vaduz|vaduz||LI||rzt|a3op|21fj|ne:j64itp|1
Val d'Or|val d or||CA|1fv|fwx|ab9q|-go1u|ne:j64l11|1
Valdez|valdez||EC|iw|8tt|9rz|-gxgf|ne:j64e73|1
Valdez|valdez||US|26|344|d3q8|-vd8b|ne:j64mah|1
Valdivia|valdivia||CL|zt|3f5b|-8j26|-fp5u|ne:j64ml1|1
Valdosta|valdosta||US|ks|1b7f|6lwp|-huky|ne:j648z1|1
Valença|valenca||BR|60|1csf|-2v30|-8djk|ne:j64gw5|1
Valencia|valencia||VE|bv|11xqo|26y7|-ekjw|ne:j64m97|1
Valencia|valencia||ES|ep|hbgg|8gom|-33o|ne:j64mh3|1
Valera|valera||VE|1rq|43i7|1zww|-f4wo|ne:j6426x|1
Valladolid|valladolid||ES|c3|6wow|8xdg|-10ng|ne:j64k7v|1
Valladolid|valladolid||MX|1wg|11en|4fhs|-iwk0|ne:j64d3f|1
Valle de la Pascua|valle de la pascua||VE|ms|1wqg|1z2c|-e5ew|ne:j64381|1
Valledupar|valledupar||CO|cj|6lu5|28v4|-fp78|ne:j646eh|1
Vallegrande|vallegrande||BO|1j8|6hy|-3yo0|-dqoc|ne:j64hx5|1
Vallejo|vallejo||US|bd|34vl|862n|-q7cl|ne:j641fx|1
Vallenar|vallenar|trehuaco|CL|4w|yn3|-64g4|-f5zk|ne:j64kr1|1
Valletta|valletta||MT||7w56|7p05|33zv|ne:j64msf|1
Valparai|valparai||IN|1p2|2g78|27ms|ghwk|ne:j64gfd|1
Valparaíso|valparaiso||CL|1t9|iay8|-72ze|-fcna|ne:j64mkz|1
Valparaíso|valparaiso||MX|1wo|84x|4vp4|-m75g|ne:j64cwp|1
Valuyki|valuyki||RU|7q|rov|arez|85yz|ne:j64c4b|1
Van|van||TR|1tb|7ytd|8916|9avk|ne:j64akn|1
Van Horn|van horn||US|1q4|1of|6nix|-mgw2|ne:j6422b|1
Vanadzor|vanadzor||AM|zo|260a|8qww|9j9v|ne:j6483j|1
Vancouver|vancouver||CA|9t|1dkz4|ak7m|-qe10|ne:j64n2b|1
Vancouver|vancouver||US|1ux|b9pm|9s33|-qaao|ne:j64l9d|1
Vanhynsdorp|vanhynsdorp|vanrhynsdorp|ZA|1vf|2kj|-6rye|40jp|ne:j64kbz|1
Vanimo|vanimo||PG|1ix|8n8|-kr8|uab4|ne:j63vx3|1
Vanino|vanino||RU|un|ed6|aird|u249|ne:j645px|1
Vannersborg|vannersborg|vanersborg|SE|1uo|guj|ciby|2n50|ne:j63wep|1
Varamin|varamin||IR|1pt|3ukz|7ki6|b2ia|ne:j64707|1
Varanasi|varanasi|benares|IN|1sy|sz7k|5fgn|hsf1|ne:j64mmb|1
Varna|varna||BG|1td|6pc2|99gc|5z8p|ne:j64i2b|1
Varnek|varnek||RU|17f|a|ey1h|cvgc|ne:j64c8f|1
Várzea Grande|varzea grande||BR|136|5cpk|-3cr8|-c16g|ne:j6478h|1
Vaslui|vaslui||RO|1tf|1hex|9ztp|5xzp|ne:j63ut5|1
Västerås|vasteras|vasteraas|SE|1un|2apm|cs3w|3jmg|ne:j643vj|1
Vatican City|vatican city||VA|yf|n4|8zbt|2o3a|ne:j644az|1
Växjö|vaxjo||SE|we|19zk|c6x1|36br|ne:j649ln|1
Vegreville|vegreville||CA|29|4hh|bgt4|-o0l0|ne:j647i3|1
Veinticinco de Mayo|veinticinco de mayo|25 de mayo|AR|e6|j18|-7ldo|-cwco|ne:j647t5|1
Vejle|vejle||DK|1o2|13hl|bxuq|21km|ne:j63ybf|1
Velikiy Novgorod|velikiy novgorod|nizhniy novgorod,novgorod,veliky novgorod|RU|19p|4orh|cje0|6pqs|ne:j64j5z|1
Velikiy Ustyug|velikiy ustyug|veliky ustyug|RU|1ub|pn9|d0w7|9x8r|ne:j64kej|1
Velikiye Luki|velikiye luki||RU|1ex|27l9|c2kg|6jhs|ne:j64j61|1
Vellore|vellore||IN|1p2|3smx|2rp0|gyq4|ne:j64ge3|1
Velsk|velsk||RU|4a|kak|d376|90tq|ne:j64ke7|1
Venado Tuerto|venado tuerto||AR|1j9|1jtg|-78ew|-da5w|ne:j64hiz|1
Venice|venice||IT|1tk|5syo|9qlv|2n6e|ne:j64m2t|1
Ventspils|ventspils||LV|1tl|x38|catn|4md2|ne:j64bbv|1
Vera|vera||AR|1j9|7p7|-6bd2|-cwmu|ne:j64hip|1
Veracruz|veracruz||MX|1tm|ceqb|43z1|-klz4|ne:j64mgb|1
Vereeniging|vereeniging||ZA|kk|n0pc|-5pm5|5zq4|ne:j64j5h|1
Vergara|vergara||UY|1ri|332|-7238|-bka4|ne:j64105|1
Verkhnevilyuysk|verkhnevilyuysk||RU|1hy|4w5|dljt|psdb|ne:j64cq5|1
Verkhniy Ufaley|verkhniy ufaley|verkhny ufaley|RU|d2|q53|c0lz|cwqx|ne:j645ht|1
Verkhnyaya Salda|verkhnyaya salda||RU|1nz|11sw|cfx2|cz7e|ne:j64caf|1
Verkhoyansk|verkhoyansk||RU|1hy|12k|eh6f|sl7e|ne:j64jbj|1
Vernal|vernal||US|1sv|b2p|8o5m|-nh4g|ne:j648mz|1
Vernon|vernon||US|1q4|8zw|7bif|-la4o|ne:j64233|1
Vero Beach|vero beach||US|jp|1udz|5xaf|-h8av|ne:j648yx|1
Verona|verona||IT|1tk|7g3n|9qmc|2css|ne:j64dub|1
Versailles|versailles||FR|1xt|1two|agjp|ggl|ne:j64fpp|1
Veszprém|veszprem||HU|1tt|1buv|a3cu|3u7a|ne:j63u4n|1
Viacha|viacha||BO|xi|qu0|-3kh0|-en07|ne:j64851|1
Viana|viana||BR|12b|kld|-ork|-9n80|ne:j64gmz|1
Viana Do Castelo|viana do castelo||PT|1tv|c03|8xqa|-1w8p|ne:j63vdd|1
Vibo Valentia|vibo valentia||IT|ba|q79|8acq|3g88|ne:j6467j|1
Viborg|viborg||DK|13y|qvj|c3fx|20j4|ne:j6473b|1
Vicente Guerrero|vicente guerrero||MX|62|9wd|6ldl|-ov4t|ne:j645ql|1
Vichuga|vichuga||RU|qr|u5b|c9i7|8ziv|ne:j64bz5|1
Vichy|vichy||FR|5a|xau|9vub|qd3|ne:j64foj|1
Vicksburg|vicksburg||US|149|jtx|6xmt|-jh7t|ne:j64jvn|1
Victor Harbor|victor harbor||AU|1m5|5zk|-7mdo|tpkt|ne:j64igj|1
Victoria|victoria||CA|9t|67h5|adpp|-qfrw|ne:j64mnz|1
Victoria|victoria||US|1q4|1djl|669e|-kshd|ne:j64iyn|1
Victoria|victoria||SC||pwo|-zme|bvus|ne:j64ms7|1
Victoria|victoria||AR|in|jeb|-6zmc|-cwco|ne:j647y1|1
Victoria|victoria||CL|xd|iy3|-8723|-fi6g|ne:j64fsh|1
Victoria Falls|victoria falls||ZW|130|rld|-3ucg|5jds|ne:j64a4z|1
Victoriaville|victoriaville||CA|1fv|w0s|9vbs|-ffar|ne:j64h5f|1
Victorica|victorica||AR|xh|3fu|-7rg3|-e10k|ne:j64hff|1
Victorville|victorville||US|bd|1sfc|7ehh|-p50n|ne:j648gb|1
Vicuña|vicuna||CL|ey|aew|-6fpj|-f5u0|ne:j64frv|1
Viedma|viedma||AR|e6|19ma|-8qtc|-di40|ne:j64k2x|1
Vienna|vienna||AT|1vl|1ffuo|abxg|3i9r|ne:j64n2j|1
Vientiane|vientiane||LA|1ty|g5sg|3umr|lzo0|ne:j64mmn|1
Việt Trì|viet tri||VN|1dm|7i28|4kl4|mli4|ne:j649yv|1
Vigan|vigan||PH|px|11gh|3rlv|pswt|ne:j64j8v|1
Vigo|vigo||ES|kb|84eg|91rs|-1vd0|ne:j64lfd|1
Vijayapura|vijayapura||IN|th|5t5k|3lwi|g86k|ne:j64jp7|1
Vijayawada|vijayawada|bezawada,bezwada|IN|33|odbc|3jhf|ha4p|ne:j64lv7|1
Vikhorevka|vikhorevka||RU|qg|4m|c0tf|lp6z|ne:j64cmh|1
Vila Real|vila real||PT|1tz|d49|8umk|-1np6|ne:j63vin|1
Vila Velha|vila velha||BR|2n|pwxv|otj|-az6v|ne:j64l0j|1
Vila Velha|vila velha||BR|iy|pwxv|-4d5o|-8n3g|ne:j64m1b|1
Vilanculos|vilanculos|vilankulo|MZ|q7|4x|-4pqz|7ki6|ne:j64btz|1
Vilhena|vilhena||BR|1gy|1csf|-2q4e|-cvv2|ne:j64mnb|1
Viljandi|viljandi||EE|1u0|fo5|cic7|5hgc|ne:j63xzh|1
Villa Ahumada|villa ahumada|miguel ahumada|MX|dd|772|6k6w|-mtu4|ne:j64cud|1
Villa Ángela|villa angela||AR|cm|n6r|-5wu1|-d0hr|ne:j647x5|1
Villa Carlos Paz|villa carlos paz||AR|fp|1hl7|-6qfs|-dtoo|ne:j647vf|1
Villa Constitución|villa constitucion||AR|1j9|y5r|-74ek|-cxnw|ne:j647yf|1
Villa Hayes|villa hayes||PY|1en|c2j|-5dlg|-cbwk|ne:j644x3|1
Villa María|villa maria||AR|fp|1zc5|-6y2s|-dk48|ne:j647v1|1
Villa Martin|villa martin|colcha k|BO|1ef|a|-4g8h|-ej0p|ne:j6485n|1
Villa O'Higgins|villa o higgins||CL|1j8|6y|-adz1|-fk4q|ne:j64had|1
Villa Rumipal|villa rumipal||AR|az|z9|-6wbt|-dtk1|ne:j647vb|1
Villa Unión|villa union||MX|1l5|bwz|4z0g|-mroc|ne:j645sd|1
Villahermosa|villahermosa||MX|1of|96ok|3uw0|-jwtk|ne:j64jef|1
Villalonga|villalonga||AR|e6|26u|-8jql|-dew9|ne:j64hfb|1
Villamontes|villamontes||BO|1pf|eh5|-4jyo|-dlyw|ne:j64hxj|1
Villanueva|villanueva||MX|1wo|8le|4sgc|-m1ts|ne:j645td|1
Villarica|villarica|villarrica|CL|xd|odu|-8f34|-fhbw|ne:j646w1|1
Villarrica|villarrica||PY|mb|vr9|-5ios|-c3fx|ne:j64j3n|1
Villavicencio|villavicencio||CO|13r|8163|w1p|-fs66|ne:j64ji3|1
Villazón|villazon||BO|1eg|spr|-4qd8|-e268|ne:j64hvx|0
Vilnius|vilnius||LT|1u2|bmhq|bpxu|5fce|ne:j64mhl|1
Vilyuysk|vilyuysk||RU|1hy|7oc|dnxt|q2go|ne:j64jc7|1
Viña del Mar|vina del mar||CL|1t9|asj2|-72v0|-fc08|ne:j646vh|1
Vinh|vinh||VN|17u|cq25|40ag|mnfk|ne:j64j1f|1
Vĩnh Long|vinh long||VN|1u3|27pu|274w|mpmg|ne:j63tg7|1
Vinnytsya|vinnytsya|vinnytsia|UA|1u4|7joz|ajtq|63rk|ne:j649ol|1
Virginia|virginia||US|142|6px|a6p1|-ju0k|ne:j648bd|1
Virginia Beach|virginia beach||US|1u5|vygo|7wdk|-ga9n|ne:j64izt|1
Visalia|visalia||US|bd|2m40|7saa|-pknc|ne:j648gj|1
Visby|visby||SE|lo|hfl|ccpd|3x7c|ne:j649mh|1
Viseu|viseu||PT|1u6|kcc|8ppm|-1p18|ne:j63vih|1
Viseu|viseu||BR|1ck|emm|-98d|-9w0o|ne:j64gn7|1
Vishakhapatnam|vishakhapatnam|visakhapatnam|IN|33|wrs8|3stk|hurq|ne:j64mkj|1
Vitim|vitim||RU|1hy|2yr|cqqb|o4i2|ne:j64cqb|1
Vitória|vitoria||BR|iy|10itc|-4ct0|-8nhb|ne:j64k11|1
Vitoria|vitoria|grande vitpria,vitoria gasteiz|ES|1ct|4taa|96ms|-klo|ne:j644al|1
Vitória da Conquista|vitoria da conquista||BR|60|6lt8|-36l0|-8r4g|ne:j64m15|1
Vitsyebsk|vitsyebsk|vitebsk|BY|1u7|7cfg|btu7|6gwt|ne:j64l4v|1
Vizianagaram|vizianagaram||IN|33|3ue6|3vtg|hwag|ne:j64fi7|1
Vladikavkaz|vladikavkaz||RU|196|7tcm|986g|9koc|ne:j64bvt|1
Vladimir|vladimir||RU|1u8|6tvc|c13o|8nsz|ne:j64kex|1
Vladivostok|vladivostok||RU|1eq|cky6|98sk|s9to|ne:j64mfn|1
Vlorë|vlore||AL|1u9|1x3e|8obq|46g6|ne:j64831|1
Voi|voi||KE|ec|s5j|-q00|89lw|ne:j64bk3|1
Voinjama|voinjama||LR|zf|kiq|1sxz|-238c|ne:j63wiz|1
Volgodonsk|volgodonsk||RU|1h1|3lf7|a6l8|91b3|ne:j64kep|1
Volgograd|volgograd||RU|1ua|l39c|afv4|9jck|ne:j64meh|1
Volkhov|volkhov||RU|ym|z8p|cuez|6xiz|ne:j64bxv|1
Volksrust|volksrust||ZA|15i|xgy|-5v3w|6ems|ne:j64bmf|1
Vologda|vologda||RU|1ub|6bjd|cov8|8k0w|ne:j64lid|1
Volos|volos||GR|1q8|2dd4|8fs4|4x30|ne:j646yp|1
Volsk|volsk||RU|1jk|1iec|b5i3|a5jj|ne:j64cd7|1
Volta Redonda|volta redonda||BR|1gm|9s4q|-4trg|-9g8m|ne:j64gxf|1
Volzhskiy|volzhskiy|volzhsky|RU|1ua|6xgd|agi4|9lhc|ne:j64c3l|1
Vorkuta|vorkuta||RU|vt|1prb|egu0|dpwk|ne:j64liz|1
Voronezh|voronezh||RU|1ug|i38g|b35z|8ezt|ne:j64lit|1
Vorontsovo|vorontsovo||RU|1pq|2s|fd87|hwsa|ne:j64ja1|1
Vossavangen|vossavangen|vossevangen|NO|os|4ar|czto|1dp6|ne:j63vo7|1
Vostok Station|vostok station|vostok|AQ||p|-gtg7|mw2o|ne:j64iuz|1
Votkinsk|votkinsk||RU|1sa|243t|c81s|bkl8|ne:j64cbb|1
Voznesensk|voznesensk||UA|15w|xy4|a6wg|6prp|ne:j649n7|1
Vratsa|vratsa||BG|1ui|1j9t|99es|51t5|ne:j64873|1
Vryburg|vryburg||ZA|198|129g|-5s0w|5atg|ne:j64kcf|1
Vryheid|vryheid||ZA|wt|37r0|-5y74|6lks|ne:j64kcx|1
Vung Tau|vung tau||VN|ao|5by7|27wi|my9u|ne:j64a0f|1
Vyazemskiy|vyazemskiy|vyazemsky|RU|un|brj|a6rk|svpv|ne:j64crh|1
Vyazma|vyazma||RU|1ll|16to|bu0q|7cli|ne:j64byx|1
Vyborg|vyborg||RU|ym|2ifl|d0e7|65vh|ne:j64kdz|1
Vyshnniy Volochek|vyshnniy volochek|vyshny volochyok|RU|1s1|15ig|ccba|7eov|ne:j645cn|1
Vyska|vyska|vyksa|RU|18e|1bkw|buvz|91cc|ne:j64bzn|1
Wa|wa||GH|1sn|1o9n|25mk|-jag|ne:j64fej|1
Wabag|wabag||PG|im|31y|-16d0|usxo|ne:j63vwj|1
Waco|waco||US|1q4|3l4j|6rfo|-ktl4|ne:j64iyv|1
Wadi Halfa|wadi halfa||SD|19d|d7l|4o7k|6pwc|ne:j64kax|1
Wafangdian|wafangdian||CN|ys|7mkk|8hr7|q5bs|ne:j646l3|1
Wagga Wagga|wagga wagga||AU|17q|16qd|-7j06|vkvs|ne:j64idx|1
Wagin|wagin||AU|1ve|18e|-74xw|p5h8|ne:j64i7b|1
Wahiawa|wahiawa||US|o1|3qum|4lx3|-xvbg|ne:j648d3|1
Wailuku|wailuku||US|o1|148k|4h77|-xjlj|ne:j648d7|1
Waingapu|waingapu|kota waingapu|ID|1a1|11oc|-22iu|prvm|ne:j64e1x|1
Wainwright|wainwright||US|26|4u|f51d|-yav3|ne:j64jxt|1
Waitakere|waitakere|waitakere city,western auckland|NZ|56|4gkk|-7wcs|11evb|ne:j64n4n|1
Waitangi|waitangi||NZ|d0|8c|-9fpj|-11svk|ne:j64n7d|1
Wajir|wajir||KE|19a|zbf|di8|8l10|ne:j64bah|1
Wakayama|wakayama||JP|1ur|9fie|7c2f|syyl|ne:j64f5j|1
Wakema|wakema||MM|5e|11cl|3k6t|kefp|ne:j64iqf|1
Waku Kungo|waku kungo||AO|ff|9b9|-2fnf|38o0|ne:j64hs3|1
Wales|wales||US|26|2r|e28w|-100yz|ne:j649k5|1
Walla Walla|walla walla||US|1ux|yu6|9vfw|-pd4r|ne:j648ef|1
Wallace|wallace||US|pq|sk|a6ba|-ouhx|ne:j6419f|1
Wallaroo|wallaroo||AU|1m5|257|-79tt|thzh|ne:j64iej|1
Walvis Bay|walvis bay||NA|iq|1462|-4x53|33x9|ne:j64lnh|1
Wamba|wamba|wamba territory|CD|1b8|35br|gik|5zz0|ne:j64ejj|1
Wanaka|wanaka||NZ|1bj|3vx|-9kw4|1094p|ne:j64n77|1
Wangaratta|wangaratta||AU|1tx|ati|-7sk0|vcuw|ne:j64m6b|1
Wangdue Prodrang|wangdue prodrang|wangdue phodrang|BT|1ut|3uw|5vod|j9sv|ne:j63znl|1
Wangqing|wangqing||CN|rj|1wgs|9aao|rt1b|ne:j64ezb|1
Wanzhou|wanzhou|wanxian|CN|dv|100ao|6lt4|n8f4|ne:j64jgn|1
Warangal|warangal||IN|1pw|pswd|3uys|h21k|ne:j64jp3|1
Warri|warri||NG|gc|hsii|16lc|18g0|ne:j64lmv|1
Warrnambool|warrnambool||AU|1tx|n3c|-8854|ujb0|ne:j64k5v|1
Warsaw|warsaw||PL|12x|10l4o|b76f|4i0t|ne:j64mv7|1
Warwick|warwick||AU|1fn|9iz|-61tg|wkzv|ne:j64ijx|1
Wasa Station|wasa station|wasa research station|AQ||a|-fnnk|-2viv|ne:j64ivh|1
Washington,  D.C.|washington d c|washington|US|gv|2kz80|8c5z|-gi82|ne:j64n2t|1
Wasilla|wasilla||US|26|6kp|d761|-w12y|ne:j649kf|1
Watampone|watampone||ID|1nh|1qzh|-yz4|pshy|ne:j64e2j|1
Waterbury|waterbury||US|et|3qfw|8wlo|-fnno|ne:j64293|1
Waterford|waterford||IE|v9|120r|b787|-1ivj|ne:j6466x|1
Waterloo|waterloo||US|qb|23vv|93vo|-jsis|ne:j648of|1
Watertown|watertown||US|17s|q3h|9fbc|-g9qf|ne:j6497h|1
Waterville|waterville||US|11d|jeo|9jrj|-exe2|ne:j643aj|1
Watsa|watsa||CD|1b8|ix0|ngg|6bus|ne:j64knx|1
Watson Lake|watson lake||CA|1wh|ma|cvv2|-rlts|ne:j64l0d|1
Wau|wau||SS|1v2|2qag|1new|5zz0|ne:j64mcn|1
Waukegan|waukegan||US|pu|4abk|92vs|-ittb|ne:j64927|1
Waukesha|waukesha||US|1vm|5cu0|97vp|-iwsq|ne:j642yj|1
Wausau|wausau||US|1vm|1m72|9mwo|-j7l8|ne:j64jwl|1
Wawa|wawa||CA|1av|1oe|aadg|-i66x|ne:j64h35|1
Waycross|waycross||US|ks|fao|6oui|-hngd|ne:j642ix|1
Weifang|weifang||CN|1ke|xaaw|7vco|piyu|ne:j64jm3|1
Weihai|weihai||CN|1ke|c0an|81co|q64o|ne:j64koh|1
Weinan|weinan||CN|1k8|3oyp|7e7g|ngwp|ne:j64epp|1
Weipa|weipa||AU|1fn|26m|-2pqi|uene|ne:j64k6l|1
Welkom|welkom||ZA|1az|99ag|-5ztg|5q90|ne:j64lgz|1
Wellington|wellington||NZ|11q|8fjs|-8uo8|11gmx|ne:j64n6b|1
Wenatchee|wenatchee||US|1ux|1cbl|a5x8|-psb6|ne:j64jtn|1
Wenshan|wenshan|wenshan city|CN|1wj|39l0|50cc|mce9|ne:j64esh|1
Wenzhou|wenzhou||CN|1x7|1ed9s|607v|puxd|ne:j64lsz|1
West Bend|west bend||US|1vm|qn6|9b2p|-iwfd|ne:j6495b|1
West Palm Beach|west palm beach||US|jp|qsi8|5qd6|-h68k|ne:j64jv7|1
Westport|westport||NZ|1v4|30c|-8y92|10s3g|ne:j64n51|1
Wetaskiwin|wetaskiwin||CA|29|94f|bcoy|-oavd|ne:j647ih|1
Wete|wete||TZ|tq|keq|-132j|8iiy|ne:j63wan|1
Wewak|wewak||PG|i1|jef|-rf3|usb3|ne:j64kd1|1
Weyburn|weyburn||CA|1jo|782|an8a|-m9b8|ne:j647hh|1
Whakatane|whakatane||NZ|7h|efg|-84vq|11xlw|ne:j64n4t|1
Whanganui|whanganui|wanganui|NZ|11q|xc0|-8k4e|11im1|ne:j64n5b|1
Whangarei|whangarei||NZ|19j|14a0|-7nns|11d32|ne:j64n5t|1
Wheeling|wheeling||US|1vb|14i4|8l4z|-hauj|ne:j64961|1
White Sulphur Springs|white sulphur springs||US|1vb|1uv|83mb|-h7mj|ne:j64315|1
Whitehorse|whitehorse||CA|1wh|hyk|d0hr|-sy1w|ne:j64mod|1
Whittier|whittier||US|26|4x|d10i|-vv7d|ne:j643rf|1
Whyalla|whyalla||AU|1m5|hen|-72tm|thfi|ne:j64m63|1
Wiarton|wiarton||CA|1av|1om|9l61|-he11|ne:j64h4j|1
Wichita|wichita||US|t2|8m2b|831s|-kv04|ne:j64iyb|1
Wichita Falls|wichita falls||US|1q4|263g|79og|-l3z7|ne:j64iyt|1
Wick|wick||GB|og|5ij|civh|-nsi|ne:j64j2n|1
Wiener Neustadt|wiener neustadt||AT|183|1ruy|a8y8|3hdw|ne:j6487d|1
Wiesbaden|wiesbaden||DE|oc|d86e|aqf8|1rno|ne:j64ekz|1
Wilcannia|wilcannia||AU|17q|ca|-6rke|uqcp|ne:j64i9t|1
Wilkes-Barre|wilkes barre||US|1cy|3em9|8ua2|-g9h7|ne:j6498l|1
Willcox|willcox||US|48|3yy|6wv8|-njgq|ne:j648ff|1
Willemstad|willemstad||CW||35a5|2m50|-esk8|ne:j64itj|1
Williams Lake|williams lake||CA|9t|axk|b64v|-q6ik|ne:j64kzf|1
Williamsport|williamsport||US|1cy|17vx|8u7v|-gi5a|ne:j6435p|1
Williston|williston||US|190|ags|abkw|-m7lk|ne:j648cv|1
Willmar|willmar||US|142|e95|9o5v|-kdcx|ne:j6415p|1
Wilmington|wilmington||US|ga|3gns|8ion|-g6x9|ne:j6496j|1
Wilmington|wilmington||US|18z|3gns|7c33|-gpfe|ne:j64lbf|1
Winchester|winchester||US|1u5|15md|8eaz|-gr4y|ne:j6494x|1
Windhoek|windhoek||NA|uv|5qw4|-4u5g|3ntf|ne:j64mgx|1
Windorah|windorah||AU|1fn|4e|-5g8s|ukp2|ne:j64m6d|1
Windsor|windsor||CA|1av|6uby|92ib|-hspt|ne:j64k25|0
Windsor|windsor||CA|19o|2zc|9n2m|-dqtn|ne:j64h6z|1
Winneba|winneba||GH|cd|y5a|15a8|-4v0|ne:j64fex|1
Winnemucca|winnemucca||US|17j|7gi|8s5i|-p8g3|ne:j648k5|1
Winnipeg|winnipeg||CA|121|djpb|aowe|-ktqk|ne:j64mnl|1
Winona|winona||US|142|pdt|9fw8|-jn3c|ne:j648bh|1
Winslow|winslow||US|48|7nv|7i8s|-nq54|ne:j648f1|1
Winston-Salem|winston salem||US|18z|61cj|7qla|-h7ag|ne:j6493h|1
Winter Haven|winter haven||US|jp|2c1w|607v|-hinm|ne:j642c1|1
Winton|winton||AU|1fn|w5|-4su4|unnh|ne:j64ijj|1
Wiseman|wiseman||US|26|e|eg55|-w68j|ne:j649l5|1
Witu|witu||KE|ec|45g|-id0|8nyk|ne:j64bjz|1
Wollongong|wollongong||AU|17q|5lbm|-7dju|wc9w|ne:j64k5l|1
Wonju|wonju||KR|kf|57sr|808f|rf6s|ne:j644j1|1
Wonsan|wonsan||KP|sz|720n|8e5x|rb9g|ne:j64ln5|1
Wonthaggi|wonthaggi||AU|1tx|4m9|-89wv|v7do|ne:j64ihx|1
Woodward|woodward||US|1ao|9z7|7t4e|-layh|ne:j648rj|1
Woomera|woomera|woomera village|AU|1m5|ci|-6oco|tbk0|ne:j64ig1|1
Worcester|worcester||US|12y|65qd|925s|-fe0g|ne:j648wn|1
Worcester|worcester||ZA|1vf|2qgd|-77kg|45zz|ne:j64lgn|1
Wrangell|wrangell||US|26|1li|c3qh|-sddw|ne:j649hl|1
Wrocław|wroclaw||PL|102|dlvx|aydc|3nek|ne:j64dez|1
Wuchuan|wuchuan||CN|17d|icg|8t3f|nvvs|ne:j646np|1
Wuhai|wuhai||CN|17d|4ojf|8i1z|mw62|ne:j64jnd|1
Wuhan|wuhan||CN|p6|4b8qg|6jz0|ohp5|ne:j64mx3|1
Wuhu|wuhu|wuhu anhui|CN|36|hd00|6px0|pdc0|ne:j64jgt|1
Wukari|wukari||NG|1p9|1zph|1oq8|23go|ne:j64d7h|1
Wum|wum||CM|18p|1h44|1ddw|25p8|ne:j64hln|1
Wuppertal|wuppertal||DE|18u|gn65|azg4|1jbo|ne:j646fp|1
Würzburg|wurzburg||DE|7k|3m29|ao9g|24rw|ne:j64emz|1
Wuwei|wuwei||CN|kg|akh0|84nk|lzze|ne:j64lop|1
Wuxi|wuxi|wuxi jiangsu|CN|re|11hjc|6ror|ps84|ne:j64l7h|1
Wuyuan|wuyuan||CN|17d|n6x|8t1s|n7fm|ne:j64f11|1
Wuzhou|wuzhou||CN|mf|9haj|5168|nuy8|ne:j64lp5|1
Wyndham|wyndham||AU|1ve|m8|-3amk|rifl|ne:j64k51|1
Xai-Xai|xai xai||MZ|kl|2rdx|-5d7k|77kg|ne:j64lh1|1
Xaignabouri|xaignabouri|sainyabuli|LA|1vq|ci0|44jd|lt3x|ne:j64dhb|1
Xalapa|xalapa|jalapa|MX|1tm|9owq|46p0|-kru8|ne:j645z3|1
Xam Nua|xam nua|xam neua|LA|ou|u34|4djb|maq5|ne:j63y8x|1
Xangongo|xangongo||AO|fi|cf|-3l60|37ic|ne:j64l3j|1
Xanthi|xanthi||GR|2z|130q|8tga|5c04|ne:j64fvj|1
Xapeco|xapeco|chapeco|BR|1j7|3fkt|-5t3s|-ba68|ne:j64k0n|1
Xiamen|xiamen||CN|jy|1hzo8|58o7|pb3h|ne:j64l6x|1
Xian|xian|xi an,xi an shaanxi|CN|1k8|2dxd4|7che|nc83|ne:j64mwz|1
Xiangtai|xiangtai|xingtai|CN|o3|d40r|7xvo|ojhk|ne:j64ett|1
Xiangtan|xiangtan||CN|p9|1jg3o|5yw8|o754|ne:j64ert|1
Xiangyang|xiangyang|xiangfan|CN|p6|mwug|6v2z|o16p|ne:j64kob|1
Xiantao|xiantao|xiantao city|CN|p6|xcm8|6ics|obal|ne:j64jjp|1
Xianyang|xianyang||CN|1k8|o4ts|7d0z|nau0|ne:j64ko7|1
Xiaogan|xiaogan||CN|p6|3fsl|6ml0|oeuw|ne:j64eqz|1
Xichang|xichang||CN|1kv|857d|5z4g|lxco|ne:j64lsd|1
Xigaze|xigaze||CN|1vt|1pq8|69p0|j1tt|ne:j64lrl|1
Xilinhot|xilinhot||CN|17d|2lc5|9f2r|ovej|ne:j64jnn|1
Xinguara|xinguara||BR|1cd|34f|-1ise|-apeg|ne:j64gnz|1
Xingyi|xingyi|xingyi guizhou|CN|mp|hhmo|5dm4|mhbl|ne:j64jgh|1
Xining|xining||CN|kg|mgn4|7ukr|lt8x|ne:j64mhv|1
Xinqing|xinqing||CN|o5|16rb|ac6z|rr9v|ne:j64f3n|1
Xinxiang|xinxiang||CN|o6|jcrc|7kjs|oem0|ne:j64jlh|1
Xinyang|xinyang||CN|o6|x11k|6vxn|og5k|ne:j64jlf|1
Xinyi|xinyi||CN|re|kmsg|7da0|pd70|ne:j646lh|1
Xinyu|xinyu||CN|rf|jkh4|5yis|omsg|ne:j64jmd|1
Xinzhou|xinzhou||CN|1kg|5zqv|88dk|o5r4|ne:j64epz|1
Xique-Xique|xique xique||BR|60|rc9|-2bhk|-95pg|ne:j64kyb|1
Xuanhua|xuanhua||CN|o3|8s5t|8p88|onj7|ne:j646kn|1
Xuanzhou|xuanzhou|xuancheng|CN|36|ik7k|6mug|pgb1|ne:j64kkj|1
Xuchang|xuchang||CN|o6|9mne|7ai4|oe8o|ne:j64eu5|1
Xuzhou|xuzhou||CN|re|18tfc|7cis|p45h|ne:j64l7f|1
Yaan|yaan|ya an|CN|1kv|7acg|6fbw|m3dc|ne:j64es1|1
Yacuíba|yacuiba||AR|1i5|1rw3|-4pzg|-dnig|ne:j647wb|1
Yakeshi|yakeshi||CN|17d|2hq4|ak90|pvk4|ne:j64f0t|1
Yakima|yakima||US|1ux|24lz|9zl2|-pttj|ne:j64jtl|1
Yako|yako||BF|1cm|ho8|2ryc|-hgm|ne:j63zw1|1
Yakossi|yakossi||CF|13e|dw|17ca|4zwv|ne:j64dtl|1
Yakutat|yakutat||US|26|31|crgx|-ty54|ne:j649kt|1
Yakutsk|yakutsk||RU|1hy|51sg|dany|rt1i|ne:j64mft|1
Yala|yala||TH|1vw|36b0|1ejl|lpir|ne:j649tb|1
Yalta|yalta||RU|fa|1pcl|9jcx|7bkq|ne:j64jy7|1
Yalutorovsk|yalutorovsk||RU|1s3|rp0|c5ao|e7k7|ne:j64cfn|1
Yamagata|yamagata||JP|1vx|5u1d|87ap|u2ps|ne:j64f65|1
Yamba|yamba||AU|17q|1e6|-6b12|wva5|ne:j64idn|1
Yambio|yambio||SS|1v6|v5q|z9l|639f|ne:j64kaj|1
Yamburg|yamburg||RU|1vz|11ew|ek39|g24l|ne:j64c8n|1
Yamoussoukro|yamoussoukro||CI|xr|4fc3|1gm0|-14pf|ne:j64mmv|1
Yanbu al Bahr|yanbu al bahr|yanbu governorate|SA|1p|5qh2|55wv|85l9|ne:j6450t|1
Yancheng|yancheng|yancheng jiangsu|CN|re|hzdk|75mb|pqvl|ne:j64kol|1
Yandoon|yandoon||MM|5e|rws|3ni9|khzh|ne:j64iqv|1
Yangambi|yangambi||CD|1b8|rez|5y0|58i4|ne:j64eix|1
Yangjiang|yangjiang||CN|me|ip4b|4olk|nzys|ne:j64dxv|1
Yangmei|yangmei||TW|1p7|3r14|5c9b|pyss|ne:j640w7|1
Yangon|yangon|rangoon|MM|1w1|2fmbk|3lil|km0f|ne:j64n05|1
Yangquan|yangquan||CN|1kg|l1ag|847g|ocb8|ne:j646jb|1
Yangzhou|yangzhou||CN|re|bkg3|6y00|plj0|ne:j646ll|1
Yanji|yanji||CN|rj|ah44|96vr|rrbs|ne:j646mp|1
Yankton|yankton||US|1m9|c0s|96vo|-kvhh|ne:j648rt|1
Yantai|yantai||CN|1ke|19cps|81lo|q0pp|ne:j64l77|1
Yaoundé|yaounde||CM|cg|yj20|tum|2guj|ne:j64mq3|1
Yarmouth|yarmouth||CA|19o|5sc|9e78|-e64m|ne:j64l1h|1
Yaroslavl|yaroslavl||RU|1w3|d05m|cclk|8jn0|ne:j64lif|1
Yarumal|yarumal||CO|3c|r8z|1i8y|-g79d|ne:j64e4n|1
Yasothon|yasothon||TH|1w4|gp7|3dtk|mbmu|ne:j63v4h|1
Yasuj|yasuj||IR|vr|22oi|6kke|b23o|ne:j640qd|1
Yaupi|yaupi||EC|153|85|-m0v|-gpcz|ne:j64e41|1
Yaynangyoung|yaynangyoung|yenangyaung|MM|115|2dax|4dvr|kc3u|ne:j64ird|1
Yazd|yazd||IR|1w6|a8r5|6uap|bnis|ne:j64lyj|1
Yazdan|yazdan|hesar e yazdan|IR|1me|1jk|76jd|d1uy|ne:j64g8j|1
Ye|ye||MM|14i|1372|39p1|kz5j|ne:j64iq1|1
Yefremov|yefremov||RU|1rt|z3t|be3n|865b|ne:j64c2z|1
Yeghegnadzor|yeghegnadzor||AM|1ti|6bs|8isr|9psl|ne:j63z4l|1
Yegoryevsk|yegoryevsk||RU|155|1xab|bvco|8d5i|ne:j64c1l|1
Yei|yei||SS|ce|3yqw|vk8|6kq8|ne:j64a97|1
Yekaterinburg|yekaterinburg|sverdlovsk|RU|1nz|s548|c6o8|czks|ne:j64mel|1
Yelets|yelets||RU|z8|2hfz|b9pk|892g|ne:j645d3|1
Yélimané|yelimane||ML|u2|rg|38rt|-29j6|ne:j64d5d|1
Yellowknife|yellowknife||CA|19k|eua|ddt0|-oioy|ne:j64mo7|1
Yemanzhelinsk|yemanzhelinsk||RU|d2|wfb|bqg1|d4xz|ne:j64c7j|1
Yên Bái|yen bai||VN|1wk|22ho|4nh6|mh7y|ne:j63tch|1
Yendi|yendi||GH|19d|x5o|20sh|-4n|ne:j64fe5|1
Yeniseysk|yeniseysk||RU|wc|fdc|cj0j|jr31|ne:j64j9v|1
Yeosu|yeosu||KR|mu|7bvu|7g14|rdoy|ne:j64aih|1
Yeppoon|yeppoon||AU|1fn|8b5|-4yht|wb8v|ne:j64imf|1
Yerema|yerema||RU|qg|kp|cxwg|n3mq|ne:j64j91|1
Yerevan|yerevan||AM|ip|nmb4|8m1z|9jgc|ne:j64mq7|1
Yessey|yessey||RU|j3|a|eof9|lwbm|ne:j64clz|1
Yevlax|yevlax|yevlakh|AZ|1w7|15g4|8pek|a3t8|ne:j6483t|1
Yevpatoriya|yevpatoriya|yevpatoria|RU|fa|296v|9oqp|75fj|ne:j649mp|1
Yeysk|yeysk||RU|wb|1vra|a0bw|878q|ne:j64c53|1
Ygatimí|ygatimi||PY|bm|261|-55ss|-bw8o|ne:j64b4x|1
Yian|yian|yi an|CN|o5|ut0|a9g4|qutk|ne:j64f23|1
Yibin|yibin||CN|1kv|jbzk|6607|meup|ne:j64jkj|1
Yichang|yichang||CN|p6|ir5k|6kwb|numl|ne:j64jjn|1
Yichun|yichun|yichun jiangxi|CN|rf|l1ps|5ys1|oip9|ne:j64koj|1
Yichun|yichun|yichun heilongjiang|CN|o5|gnjc|a82j|rml0|ne:j64jnv|1
Yilan|yilan|yilan city|TW|1w9|37qo|5az0|q3fg|ne:j640wl|1
Yinchuan|yinchuan||CN|18a|l8ns|88u3|mrzr|ne:j64mjt|1
Yingkow|yingkow|yingkou|CN|ys|h1fc|8ptv|q7i5|ne:j64jlp|1
Yining|yining|yining city|CN|1vs|bmln|9eqg|hfp8|ne:j64lrp|1
Yirga Alem|yirga alem|irgalem|ET|1mp|s04|1g34|88dg|ne:j64fxl|1
Yishan|yishan||CN|mf|10ba|591o|nah7|ne:j64dvj|1
Yishui|yishui|yishui county|CN|1ke|20mb|7o5s|pfa0|ne:j64ev1|1
Yitulihe|yitulihe||CN|17d|f5p|autw|q1mn|ne:j64f0n|1
Yiyang|yiyang|yiyang hunan|CN|p9|sz7k|64p4|o2q9|ne:j64jk1|1
Yogyakarta|yogyakarta|yogyakarta city|ID|1wb|dn90|-1o14|nnnq|ne:j64kj5|1
Yokohama|yokohama||JP|su|279ba|7ldv|tx6c|ne:j64jof|1
Yola|yola||NG|e|222u|1z2c|2oao|ne:j64khp|1
Yomou|yomou||GN|1a4|2se|1mew|-1zj0|ne:j64gj5|1
Yongzhou|yongzhou||CN|p9|lfls|5mer|nx91|ne:j64jjz|1
Yopal|yopal||CO|c1|1b39|159a|-fios|ne:j640kh|1
York|york||US|1cy|4o7u|8kct|-gg1c|ne:j6497z|1
York|york||GB|1wc|3en7|bkfs|-8c0|ne:j64adb|1
Yorkton|yorkton||CA|1jo|bpg|az6z|-lymx|ne:j64gyn|1
Yoro|yoro||HN|1wd|c66|387c|-ipj8|ne:j63th1|1
Yoshkar Ola|yoshkar ola|yaskar ola|RU|12h|6yba|c502|a9el|ne:j64c9n|1
Young|young||AU|17q|5sd|-7cqg|vs7o|ne:j64ib3|1
Youngstown|youngstown||US|1aj|6oqe|8t4l|-haap|ne:j64jw5|1
Yozgat|yozgat||TR|1we|1vt5|8j8k|7gmu|ne:j63ttp|1
Ypacaraí|ypacarai||PY|4r|n9i|-5g2c|-c9z4|ne:j644y5|1
Ype Jhu|ype jhu|ypehu|PY|bl|go|-54ho|-bvxk|ne:j644zb|1
Yuba City|yuba city||US|bd|2ho9|8e0i|-q2e6|ne:j648h1|1
Yuci|yuci||CN|1kg|i05c|82rb|o5td|ne:j64jjh|1
Yueyang|yueyang||CN|p9|hpcg|6apo|o8o5|ne:j64ls5|1
Yulara|yulara||AU|19i|pu|-5er9|s2pt|ne:j64k3z|1
Yulin|yulin|yulin guangxi|CN|mf|o5lk|4umn|nlwp|ne:j64lp1|1
Yulin|yulin||CN|1k8|3cc8|87e9|niph|ne:j64lrz|1
Yuma|yuma||US|48|1zd5|7079|-okfw|ne:j64ixf|1
Yumen|yumen|yumen city|CN|kg|7i28|8jbw|ky38|ne:j6469d|1
Yunxian|yunxian|yun county|CN|p6|2v1y|715e|nr1k|ne:j64er7|1
Yurga|yurga||RU|uc|1szg|bxze|i6za|ne:j64cgz|1
Yuscarán|yuscaran||HN|if|1tv|2zlc|-im5a|ne:j63tjn|1
Yuxi|yuxi||CN|1wj|8ht1|5848|lzfo|ne:j64jkp|1
Yuzhno Sakhalinsk|yuzhno sakhalinsk||RU|1hz|3s6c|a2du|ule0|ne:j64lll|1
Zabīd|zabid||YE|1e|39o8|31j3|9a83|ne:j649gz|1
Zabol|zabol||IR|1le|50j4|6nd3|d6e7|ne:j64kup|1
Zacapa|zacapa||GT|1wn|rug|37iw|-j6t6|ne:j63xn3|1
Zacatecas|zacatecas||MX|1wo|50xd|4vp4|-lzig|ne:j64cwh|1
Zacatecoluca|zacatecoluca||SV|xi|ukd|2w88|-j1pk|ne:j63wwp|1
Zadar|zadar||HR|1wp|1ize|9gfl|39rj|ne:j64efj|1
Zagazig|zagazig||EG|4k|63zd|6jzd|6r6n|ne:j63x9n|1
Zaghouan|zaghouan||TN|1wq|d1r|7sv4|26am|ne:j63t8x|1
Zagreb|zagreb||HR|lu|fhi6|9te8|3fgg|ne:j64mjf|1
Zahedan|zahedan||IR|1le|cu3r|6bmg|d1d8|ne:j64kut|1
Zahlé|zahle||LB|159|1oap|796t|7p1e|ne:j64del|1
Zakho|zakho||IQ|gp|2w27|7ylx|95dk|ne:j64fwb|1
Zalaegerszeg|zalaegerszeg||HU|1ws|1bre|a1g8|3lxs|ne:j63u57|1
Zalantun|zalantun||CN|17d|2yi8|aadc|qaww|ne:j646nl|1
Zalău|zalau||RO|1i2|1csg|a406|4xye|ne:j63upv|1
Zambezi|zambezi||ZM|19c|5gi|-2wh4|4ybf|ne:j64jzj|1
Zamboanga|zamboanga|zamboanga city|PH|1ww|gkg8|1her|q5yl|ne:j64lk1|1
Zamora|zamora||MX|13v|4lur|4a64|-lx74|ne:j64cyj|1
Zamora|zamora||EC|1wy|bsc|-veg|-gxc4|ne:j64e3b|1
Zanesville|zanesville||US|1aj|uwk|8k6j|-hkth|ne:j642t7|1
Zanjan|zanjan||IR|1wz|7ntr|7uy4|ae88|ne:j6470z|1
Zanzibar|zanzibar|zanzibar city|TZ|1x1|8ngq|-1bj4|8egw|ne:j64mh1|1
Zaozernyy|zaozernyy|zaozyorny|RU|wc|q4p|bzt0|kaqc|ne:j645mb|1
Zaozhuang|zaozhuang||CN|1ke|19z3c|7h5f|p75t|ne:j64l7b|1
Zapala|zapala||AR|17h|es0|-8c5k|-f0mz|ne:j64k2n|1
Zaporizhzhya|zaporizhzhya|zaporiyhzhya,zaporizhzhia|UA|1x2|gw0w|a9a8|7jet|ne:j64j0p|1
Zarafshon|zarafshon|zarafshan|UZ|174|1d13|8wum|drdu|ne:j649rh|1
Zaragoza|zaragoza||ES|3z|dx30|8xdg|-6v8|ne:j64kij|1
Zaranj|zaranj||AF|188|12gr|6o28|d9iu|ne:j63z6l|1
Zárate|zarate||AR|e6|1wi5|-7b1c|-cnk0|ne:j64hdp|1
Zaraza|zaraza||VE|ms|w0b|202k|-e00g|ne:j6499p|1
Zareh Sharan|zareh sharan|zarghun shar|AF|1c3|all|71h0|enwn|ne:j63z7p|1
Zaria|zaria||NG|s9|j1yg|2dib|1nh5|ne:j64khl|1
Zarzis|zarzis||TN|15y|3et5|76kg|2dnc|ne:j649e3|1
Zaysan|zaysan||KZ|hz|dkw|a6bk|i6s6|ne:j64g3j|1
Zelenodolsk|zelenodolsk||RU|1pn|24uo|byva|affa|ne:j645kj|1
Zelenokumsk|zelenokumsk||RU|1mx|vve|9inv|9ekj|ne:j64bvz|1
Zemio|zemio||CF|nw|ffk|12u9|5dxh|ne:j64dth|1
Zemlya Bunge|zemlya bunge|bunge land|RU|1hy|a|g1x3|ughm|ne:j645p5|1
Zenica|zenica||BA|1x5|3ivb|9h7c|3u9s|ne:j64887|1
Zeya|zeya||RU|2t|ktz|biqk|r9zu|ne:j64jan|1
Zhaltyr|zhaltyr||KZ|3q|ja|b2ec|eyu0|ne:j64g1x|1
Zhangaozen|zhangaozen|zhanaozen|KZ|11u|6v3|9a3w|bbeo|ne:j64g7j|1
Zhangjiakou|zhangjiakou||CN|o3|mf3k|8r27|omsg|ne:j64jkz|1
Zhangye|zhangye||CN|kg|4y14|8cdw|lj2s|ne:j64lon|1
Zhangzhou|zhangzhou||CN|jy|23onf|5978|p7y4|ne:j64dwj|1
Zhanibek|zhanibek|zhanybek|KZ|1v7|6c4|aldw|a1pg|ne:j64g1f|1
Zhanjiang|zhanjiang||CN|me|y2uo|4jlf|nnol|ne:j64lph|1
Zhanyi|zhanyi||CN|1wj|dzjw|5hj9|m91z|ne:j64esl|1
Zhaodong|zhaodong||CN|o5|3uvg|9vk4|r02g|ne:j64f35|1
Zhaoqing|zhaoqing||CN|me|aadc|4xuw|o3o4|ne:j64dyd|1
Zhaotang|zhaotang|zhaotong|CN|1wj|hc88|5utj|m8al|ne:j64jkl|1
Zharkent|zharkent||KZ|2e|s5s|9gr4|h54p|ne:j64641|1
Zheleznogorsk|zheleznogorsk||RU|wp|23jg|b7z0|7l6k|ne:j64c1d|1
Zheleznogorsk Ilimskiy|zheleznogorsk ilimskiy|zheleznogorsk ilimsky|RU|qg|lyg|c4jm|mbez|ne:j64cmd|1
Zhengzhou|zhengzhou||CN|o6|1khy8|7g6p|od13|ne:j64mxb|1
Zhenjiang|zhenjiang|zhenjiang jiangsu|CN|re|iay8|6wmj|plih|ne:j64jml|1
Zhetiqara|zhetiqara|zhitikara|KZ|1fh|102c|b6q2|d4j3|ne:j64g0j|1
Zhezqazghan|zhezqazghan|jezkazgan,zhezkazgan|KZ|1fc|28it|a8o8|eix0|ne:j64js3|1
Zhigansk|zhigansk||RU|1hy|2hx|eb75|qfxr|ne:j64lld|1
Zhijiang|zhijiang|zhijiang town|CN|p9|2fw3|5vqh|nia4|ne:j64erl|1
Zhilinda|zhilinda||RU|1hy|a|f15l|ofmo|ne:j64cqt|1
Zhob|zhob||PK|6d|1w6c|6pw2|evsi|ne:j64bdh|1
Zholymbet|zholymbet||KZ|3q|5b0|b3b2|fdbf|ne:j64g2b|1
Zhongli|zhongli|jhongli,jungli|TW|1p7|yzqg|5cmq|pzbc|ne:j6489x|1
Zhongshan Station|zhongshan station|formerly sun yat sen station|AQ||1o|-evr9|gd1d|ne:j64iux|1
Zhosaly|zhosaly||KZ|1fw|fhd|9qzh|dqfg|ne:j646zv|1
Zhoukou|zhoukou||CN|o6|82xx|77hs|okho|ne:j64eub|1
Zhuanghe|zhuanghe||CN|ys|5ls6|8i6v|qcs3|ne:j64eux|1
Zhubei|zhubei|jhubei|TW|oz|4abk|5bm5|pxqf|ne:j640x7|1
Zhucheng|zhucheng||CN|1ke|mpwg|7pp8|pl55|ne:j646l7|1
Zhuhai|zhuhai||CN|me|lxco|4rwl|oca2|ne:j64kkl|1
Zhuozhou|zhuozhou||CN|7m|dgkg|8h3d|otfw|ne:j6469l|1
Zhuzhou|zhuzhou||CN|p9|n5c0|5yr3|o921|ne:j64jjx|1
Zhytomyr|zhytomyr|zhytomyra|UA|1x8|61qo|arp4|655q|ne:j64lcf|1
Zibo|zibo||CN|1ke|1tlvs|7vyr|pav4|ne:j64msx|1
Zicheng|zicheng|zhicheng|CN|p6|52wi|6hss|nwc8|ne:j64eqp|1
Zielona Góra|zielona gora||PL|107|2jdt|b4uo|3blk|ne:j64df7|1
Zigong|zigong||CN|1kv|nomg|6av7|mgh1|ne:j64erx|1
Ziguinchor|ziguinchor||SN|1x9|43xg|2p58|-3hp0|ne:j64ka5|1
Žilina|zilina||SK|1y6|1vm1|ajs6|40o6|ne:j64bc7|1
Zillah|zillah|zella|LY|1m|a|64ao|3roa|ne:j64dch|1
Zima|zima||RU|qg|1ahb|bk5f|lvaj|ne:j64j9d|1
Zinder|zinder||NE|1xa|4xqu|2yhc|1xbd|ne:j64mbv|1
Ziniaré|ziniare||BF|1bo|9sv|2p1m|-9z6|ne:j63zvl|1
Zixing|zixing||CN|p9|53u|5kdw|ob00|ne:j646jx|1
Zlatoust|zlatoust||RU|d2|43nq|btqe|cs9g|ne:j64kf1|1
Zlín|zlin||CZ|wa|2o5e|ajv4|3s6s|ne:j64enl|1
Zmeinogorsk|zmeinogorsk||RU|2h|8vu|ayqb|hm7y|ne:j64cfv|1
Zomba|zomba||MW|1xd|1qg4|-3ar0|7kgc|ne:j64kpf|1
Zongo|zongo||CD|f9|dmr|xev|3zmu|ne:j64ecl|0
Zonguldak|zonguldak||TR|1xb|3d2u|8vog|6t7s|ne:j64ajj|1
Zorgo|zorgo|zorgho|BF|kh|ifo|2mgu|-4pq|ne:j63zy7|1
Zouar|zouar||TD|84|5o|4duz|3jj2|ne:j64edx|1
Zouirat|zouirat|zouerat|MR|1qm|17h5|4ve0|-2obl|ne:j64d3t|1
Zrenjanin|zrenjanin||RS|1mt|1df9|9q56|4dej|ne:j647op|1
Zucchelli Station|zucchelli station|formerly terra nova bay|AQ||28|-fzrk|z74e|ne:j64iu7|1
Zug|zug||CH|1xg|i2z|a41a|1thi|ne:j63um7|1
Zumpango|zumpango||MX|161|5cwg|48uw|-l8qk|ne:j64d1x|1
Zunyi|zunyi||CN|mp|i73c|5xr0|mwzh|ne:j64jgl|1
Zürich|zurich||CH|1xj|nqxs|a5ln|1tyh|ne:j64muf|1
Züünkharaa|zuunkharaa|dzuunharaa|MN|1jz|ej2|ah22|mti2|ne:j64jfp|1
Zuwara|zuwara|zuwarah|LY|2w|3v4m|724g|2l7b|ne:j64lxf|1
Zvëzdnyj|zvezdnyj|zvezdnyy|RU|dy|a|f7i6|-12hq4|ne:j645a7|1
Zvishavane|zvishavane||ZW|13x|rp4|-4cv4|6fv8|ne:j64a53|1
Zvolen|zvolen||SK|6r|yc6|aevh|43ms|ne:j64bc3|1
Zwedru|zwedru||LR|m0|jta|1au8|-1qqc|ne:j64b7l|1
Zwolle|zwolle||NL|1bw|2e9p|b9a0|1b1m|ne:j63vm7|1
Zyryanka|zyryanka||RU|1hy|2sr|e380|wc9w|ne:j64jbp|1
Zyryanovsk|zyryanovsk|altai|KZ|hz|12be|anu5|i244|ne:j64g3n|1`;

/** The bundled city gazetteer. Injected into `searchGazetteer(query, gazetteer, opts?)`. */
export const GAZETTEER: Gazetteer = decodeGazetteer({ source: 'nvkelso/natural-earth-vector@v5.1.2/geojson/ne_10m_populated_places.geojson' }, PACKED);
