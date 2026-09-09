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
 * Rows   : 7244 shipped of 7342 coded source rows · 2500 admin-1 names · 223 country names
 * Refused: 98 — ARCHITECTURE §8.4 **A-82** Part 5, the consistency invariant. A row ships only
 *          where `countryOf(row.centre, COUNTRY_INDEX)` is the row's own ISO code or `null`. The
 *          refused rows are border towns the shipped index draws on the wrong side of a frontier
 *          (Maastricht, Niagara Falls, Lugano, Arlon…), and shipping one would put it in the wrong
 *          country on a user's lifetime map. Every one is named in
 *          `fixtures/golden/gazetteer-refusals.json`, and ROADMAP **I-22** is what would restore
 *          them.
 * Census : 6805 agree with ISO_A2 · 427 countryOf-silent (A-26's honest hole) ·
 *          98 contradicted (refused) · 12 carry no ISO_A2 at all
 * Order  : ascending folded name, then descending population, then ascending ISO code, then
 *          ascending NE_ID. A **total** order, so a regeneration cannot reshuffle the list, and it
 *          is a property of THIS FILE — `decodeGazetteer` preserves it and does not re-derive it.
 * Coords : 4 decimal places (~11 m), stored as base-36 tenth-thousandths. `countryOf` was
 *          evaluated against the QUANTISED coordinate, so the invariant holds for the bytes that
 *          ship rather than for the ones that were measured.
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

const PACKED = `2500|223|7244
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
Moyotte
Mpigi
Mpumalanga
Mtwara
Mubende
Mudug
Mugla
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
GH Ghana
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
25 de Mayo|25 de mayo|veinticinco de mayo|AR|1fc|dg6|-83o0|-ei8x|j647u1
Aalborg|aalborg|alborg|DK|187|2maz|c82p|24im|j64gi1
Aarau|aarau||CH|1|byl|a5nw|1pzo|j63ugd
Aba|aba||NG|3|j8k8|13cs|1kpo|j64d6v
Abadan|abadan||IR|un|7xms|6i17|acj1|j64ku3
Abadla|abadla||DZ|5n|b30|6nbv|-l39|j64hyb
Abaetetuba|abaetetuba||BR|1bz|1pa4|-db1|-ah75|j64kwt
Abaí|abai||PY|b0|2c0|-5kug|-bzmw|j64b4t
Abakan|abakan||RU|w0|3l2x|bidp|jlle|j64lkf
Abancay|abancay||PE|3o|16iv|-2x8s|-fmf8|j64azd
Abau|abau||PG|cb|6e|-25hm|vuc2|j64bpv
Abaza|abaza||RU|uc|dym|baea|jb6i|j645ln
Abbotsford|abbotsford||CA|9r|391f|aih4|-q7o8|j64h0p
Abbottabad|abbottabad||PK|15m|pdb3|7bhz|fot7|j64573
Abéché|abeche||TD|1b0|3e5p|2ysg|4gq4|j64mj5
Abengourou|abengourou||CI|14v|289g|1fxk|-qxg|j64gl3
Abeokuta|abeokuta||NG|19v|cpn0|1j90|puk|j64d7z
Aberdeen|aberdeen||GB|2|4244|c94o|-g1s|j64abp
Aberdeen|aberdeen||US|1u8|p9l|a2gl|-qjcw|j648ej
Aberdeen|aberdeen||US|1ln|k3d|9qt7|-l3xc|j648s5
Abha|abha||SA|1wu|4ipy|3wnx|93xl|j64kbb
Abidjan|abidjan||CI|xl|29hn4|152b|-v6s|j64mz3
Abilene|abilene||US|1ph|2g5j|6ydi|-ldjk|j64jup
Aboa Station|aboa station||AQ||i|-g334|-2viv|j64iw1
Abohar|abohar||IN|1ei|2srv|6ges|fx84|j64g91
Aboisso|aboisso||CI|1mn|t1y|166j|-oow|j63ylz
Abomey|abomey||BJ|1wn|1re2|1jhc|fcs|j64hyx
Abong Mbang|abong mbang||CM|iw|bb9|uql|2tq1|j64hmf
Abra Pampa|abra pampa||AR|rg|3gg|-4va7|-e2y0|j647vt
Abu Dhabi|abu dhabi||AE|6|cxno|58sb|bnhu|j64mat
Abu Kamal|abu kamal||SY|g3|1qco|7dtk|8rqa|j649g5
Abuja|abuja||NG|jc|xs1s|1y3p|1m42|j64mhb
Abunã|abuna||BR|1gc|1hl|-22t6|-e0bh|j64goz
Acapulco|acapulco|acapulco de juarez|MX|me|fc5c|3m0k|-leyg|j64mg7
Acaraú|acarau||BR|c8|lwl|-mao|-8lkg|j64gun
Acarigua|acarigua||VE|1dt|5lbt|21x8|-ety8|j648wb
Acatlan|acatlan|acatlan de osorio|MX|1ee|ekf|3wfk|-l0k4|j645wd
Accra|accra||GH|lx|19gko|16u8|-1or|j64my3
Achacachi|achacachi||BO|x6|6in|-3g3l|-epu2|j6484x
Achinsk|achinsk||RU|w0|2irm|c26k|jeaw|j64j9t
Açu|acu|assu|BR|1fz|rvh|-171w|-7wst|j64gxx
Ad Dakhla|ad dakhla|dakhla|MA|1b5|1wwc|52z9|-3eyw|j64kit
Ad Damazīn|ad damazin||SD|8o|3zk3|2itk|7d1o|j649gn
Ad-Damir|ad damir|eddamer|SD|1g4|2879|3rq4|7a1c|j64kat
Ad Diwaniyah|ad diwaniyah|al diwaniyah|IQ|22|7ojs|6utt|9mmw|j6470p
Ad Nabk|ad nabk|an nabk|SY|fw|12pu|7ah6|7vfp|j649gj
Adana|adana|seyhan|TR|f|rpoo|7xgx|7kil|j64ldx
Adapazarı|adapazari||TR|1hc|5kp9|8qtc|6iom|j64j2f
Addis Ababa|addis ababa||ET|g|1ufz4|1xpt|8alh|j64n25
Adelaide|adelaide||AU|1lj|ojhk|-7hjm|tpfh|j64mrh
Adelaide River|adelaide river||AU|18x|6l|-2u8f|s3ko|j64i6t
Aden|aden||YE|1wt|lfls|2qlx|9nan|j64mbn
Adigrat|adigrat||ET|1pv|289h|326s|8gjw|j64fxd
Adıyaman|adiyaman||TR|h|4sn4|83fs|87db|j64af5
Adjumani|adjumani||UG|i|qrw|pxq|6tg1|j63tz3
Ado Ekiti|ado ekiti||NG|i8|9kpp|1mvk|14a0|j64d8p
Adrar|adrar||DZ|j|17wu|5z1o|-28k|j64l3v
Afyon|afyon|afyonkarahisar|TR|l|3d4w|8b00|6jq4|j64aet
Agadez|agadez||NE|n|2ive|3n53|1plg|j64mcj
Agadir|agadir||MA|1lh|hoxn|6ivk|-2288|j64kdd
Agana|agana|hagatna|GU||2mgb|2vxo|v0wc|j64l55
Agapa|agapa||RU|1p3|a|fbbc|j4no|j64cnx
Agboville|agboville||CI|o|1r3e|19u3|-x0w|j64gkh
Agdam|agdam||AZ|1ql|0|8rml|9rik|j63z33
Agen|agen||FR|3t|18xb|9h1w|4vx|j64fnn
Aginskoye|aginskoye||RU|m|8v7|aybb|ojnw|j64con
Agordat|agordat||ER|kf|m2g|3bz6|84c3|j64ejx
Agra|agra||IN|1sa|y4e8|5tnw|gpyb|j64l87
Ağrı|agri||TR|p|1vse|8iha|986p|j64agn
Agrinio|agrinio||GR|hp|1m1t|8a0a|4l6l|j64fu7
Agua Prieta|agua prieta||MX|1la|1uf7|6pon|-nhe6|j64cvl
Aguascalientes|aguascalientes|aguascalientes city|MX|q|imiw|4ou6|-lxak|j64je7
Aguelhok|aguelhok||ML|ur|6y0|4645|6lw|j64ct5
Ahar|ahar||IR|hs|27yv|88xp|a351|j64715
Ahmedabad|ahmedabad|ahmadabad|IN|fo|377dk|4xps|fk0l|j64myx
Ahmednagar|ahmednagar||IN|10w|8ea8|43gg|g0rw|j64jpf
Ahuachapán|ahuachapan||SV|t|qba|2zee|-j98y|j63wvf
Ahvaz|ahvaz|ahwaz|IR|un|lcio|6pdf|afwt|j64lyl
Aiguá|aigua||UY|115|22s|-7bw0|-bqgc|j6413f
Aiken|aiken||US|1ll|zn8|76vb|-hik6|j64913
Aiquile|aiquile||BO|eb|6cg|-3wcn|-dyxk|j64hbl
Aix-en-Provence|aix en provence||FR|1eb|35ad|9bsw|161w|j646tj
Aizawl|aizawl||IN|13y|62dp|52y8|jvfk|j64ggf
Ajaccio|ajaccio||FR|f3|15y4|8zif|1vcj|j64fnt
Ajdabiya|ajdabiya||LY|y|32zd|6lf8|4c0o|j64ksf
Ajmer|ajmer||IN|1fe|cn8h|5o38|fzxc|j6471z
Aketi|aketi||CD|1an|197t|l59|53hk|j64ej1
Akhtubinsk|akhtubinsk||RU|4p|ydj|acir|9w8n|j64kfj
Akita|akita||JP|10|6uyt|8iek|u0xw|j64joh
Akjoujt|akjoujt||MR|pu|aa|48da|-331i|j640nf
Akola|akola||IN|10w|asi6|4fss|gi7o|j64lvv
Akron|akron||US|19y|f2lc|8swg|-hh0g|j6493l
Aksu|aksu||CN|1v2|ew9k|8tik|h77o|j64jj1
Aksum|aksum|axum|ET|1pv|10n3|3114|8ark|j64fxh
Akure|akure||NG|1a9|90j6|1jy0|144g|j64d87
Akureyri|akureyri|akureyi|IS|12|cs3|e2oq|-3vns|j64k2h
Al Ahmadi|al ahmadi||KW|14|1h23|68cx|ab0m|j6458l
Al Amarah|al amarah|thi qar|IQ|12v|7e7j|6tow|a3tk|j64g6x
Al Aqabah|al aqabah|aqaba|JO|3p|21c8|6bty|7int|j64dt7
Al Ayn|al ayn|al ain|AE|6|8rdp|56yp|by3c|j649ql
Al Bayda|al bayda||YE|17|t6l|2zv2|9rng|j640ah
Al Bayda|al bayda||LY|1i|1du|70s4|4mtk|j64ddp
Al Fallujah|al fallujah|fallujah|IQ|1z|4yvf|75b9|9dsd|j64gld
Al Fujayrah|al fujayrah|fujairad,fujairah|AE|jt|20nn|5duq|c2pb|j649qh
Al Ghaydah|al ghaydah||YE|1q|l58|3hay|b6hy|j649pv
Al Hasakah|al hasakah||SY|nj|2quc|7ti9|8qfg|j643ij
Al Hillah|al hillah|hillah|IQ|5o|cqst|6yk1|9ird|j64glh
Al Hillah|al hillah||SA|3v|cqst|518v|a0rw|j6453n
Al Hudaydah|al hudaydah||YE|1e|gpuo|3673|97eu|j64jxf
Al Jaghbub|al jaghbub|jaghbub|LY|19|1cg|6dk0|5966|j64deh
Al Jahra|al jahra|al jahrah|KW|1j|45u9|6adb|a7qd|j6458t
Al Jawf|al jawf||LY|1n|imc|56q8|4zpg|j64lx7
Al Jubayl|al jubayl|jubail governorate|SA|4j|532y|5sda|an2k|j64bd7
Al Karak|al karak||JO|sx|1pry|6omj|7nhz|j64dtd
Al Khalil|al khalil|hebron|PS||60ap|6rda|7iss|j6488t
Al Kharj|al kharj|al kharj governorate|SA|3v|6e9o|56dw|a528|j64bcx
Al Khums|al khums|khoms|LY|1r|4btj|700c|3214|j64dcl
Al Kut|al kut|kut|IQ|1u9|6w35|6yp7|9tmo|j64g71
Al Mafraq|al mafraq|mafraq|JO|10m|182m|6x3l|7rkt|j63wmz
Al Marj|al marj|campament of al marj|LY|1d|3mtg|6yrx|4gq4|j64ddl
Al Mubarraz|al mubarraz||SA|4j|6ede|5g7n|amgb|j6453v
Al Mukalla|al mukalla|mukalla|YE|n0|5j6c|3478|aj23|j64jyj
Al Musayyib|al musayyib|musayyib|IQ|5o|1mzq|70x6|9hqs|j6473n
Al Qamishli|al qamishli|qamishli|SY|nj|28bv|7xq4|8u4s|j643i5
Al-Qatif|al qatif|qatif governorate|SA|4j|7wn0|5omk|apw3|j6453z
Al Qunfudhah|al qunfudhah|al qunfudhah governorate|SA|111|4d|43kw|8syt|j64j3z
Al Quwayiyah|al quwayiyah|al quway iyah governorate|SA|3v|6q0|55r5|9pdy|j6453h
Al-Ubayyid|al ubayyid|el obeid|SD|18j|8fhb|2tq1|6h5j|j64lfz
Al Wajh|al wajh|al wajh governorate|SA|1nu|xd1|5mes|7tcs|j64kaf
Alagoinhas|alagoinhas||BR|5z|2nqe|-2lo8|-88j0|j64k0x
Alajuela|alajuela||CR|25|8b6n|25bc|-i1x8|j646c1
Alamogordo|alamogordo||US|175|rtm|71ur|-mpl9|j64ixv
Alapayevsk|alapayevsk||RU|1nc|xy8|cech|d80j|j645ip
Alappuzha|alappuzha||IN|u5|3sen|21b0|gd9w|j64fj7
Alatyr|alatyr||RU|e0|ztn|br88|9zkg|j64cbv
Alausí|alausi||EC|dd|b12|-gwc|-gwes|j646b3
Alayat Samail|alayat samail|alayat sama il|OM|a|10ti|4zt4|cfd2|j645m5
Alba Lulia|alba lulia|alba iulia|RO|27|1ezp|9vj6|51y0|j63uof
Albacete|albacete||ES|c2|3dzi|8cxf|-efg|j649cv
Albany|albany||US|178|inuk|958s|-ftlj|j64jwn
Albany|albany||US|kn|1whq|6rnv|-i1cm|j648z5
Albany|albany||US|1ai|13n4|9kal|-qdqt|j648lx
Albany|albany||AU|1uo|kel|-7i6x|p9no|j64m5h
Albert Lea|albert lea||US|13m|fu2|9cse|-k0fr|j64151
Albuquerque|albuquerque||US|175|j9ea|7ive|-muul|j64l9x
Albury|albury||AU|176|28g2|-7q8o|vhn4|j64k53
Aldama|aldama|maclovio herrera|MX|1oc|9hg|4wus|-l0po|j64cxl
Aldan|aldan||RU|1hd|iui|ck6m|qvie|j64ll7
Aleg|aleg||MR|9i|6h0|3nmc|-2zbm|j640mz
Aleksandrovsk Sakhalinskiy|aleksandrovsk sakhalinskiy|alexandrovsk sakhalinsky|RU|1he|9a0|awq7|ugvt|j64jdn
Alekseyevka|alekseyevka|alexeyevka|RU|7o|uqw|auuf|8ak3|j64c45
Aleksin|aleksin||RU|1r5|1flx|bomv|7y80|j645f1
Alenquer|alenquer||BR|1bz|kaa|-eys|-bqrg|j64gnp
Aleppo|aleppo|halab|SY|2a|1monk|7rkf|7ysh|j64mub
Alert|alert||CA|19e|3h|hog1|-dcbo|j64kzx
Ålesund|alesund||NO|109|10v0|delq|1dag|j64bb7
Alexander Bay|alexander bay||ZA|18u|15o|-64qr|3jc9|j64kbt
Alexandria|alexandria|al iskandariyah|EG|1g|2h9qg|6or8|6f2x|j64mwl
Alexandria|alexandria||US|1tg|2q7d|8bjg|-giwo|j6494f
Alexandria|alexandria||US|zl|1n2t|6plj|-jtb6|j64jun
Alexandria|alexandria||RO|1pb|122q|9eqw|5f43|j63ubh
Alexandroupoli|alexandroupoli||GR|2z|14vn|8r6u|5jnc|j646z3
Aleysk|aleysk||RU|2h|lmb|b912|hqpt|j64cfz
Algeciras|algeciras||ES|31|2do3|7qr7|-166h|j643f3
Algha|algha|alga|KZ|3r|lt7|ap20|caee|j64g05
Algiers|algiers|el djazacr|DZ|2b|1zvyo|7voi|niu|j64mzz
Ali Sabih|ali sabih|ali sabieh|DJ|2c|ux6|2e2y|95kl|j64ek7
Alicante|alicante||ES|en|6rpz|87x4|-3qc|j64auv
Alice|alice||US|1ph|hhb|5y4h|-l0pt|j6420d
Alice Springs|alice springs||AU|18x|ldq|-52vm|sp0w|j64mrb
Aligarh|aligarh||IN|1sa|h954|5z8e|gqba|j64l8b
Alipur Duar|alipur duar|alipurduar|IN|1ud|2q9a|5ocl|j73n|j64gcf
Aliwal North|aliwal north||ZA|i0|yac|-6ksw|5q3g|j64but
Allahabad|allahabad||IN|1sa|pqp4|5gfd|hjgt|j64l81
Allakaket|allakaket||US|26|2p|e9mf|-wptj|j643uf
Allanmyo|allanmyo|myede|MM|10r|18o9|45iv|kes7|j64ir7
Allende|allende||MX|e9|f5g|62lg|-lm5w|j645rb
Allentown|allentown||US|1cd|an22|8p9s|-g6k8|j6436j
Alliance|alliance||US|16q|6fs|90uu|-m1r2|j641tb
Almaty|almaty||KZ|2e|pwvc|9ab9|ghgr|j64mm1
Almenara|almenara||BR|13l|mmt|-3gro|-8q1k|j6478d
Almería|almeria||ES|31|3ufh|7w6n|-ir0|j649cd
Almetyevsk|almetyevsk||RU|1p0|30d1|brm4|b7pb|j64cdl
Almirante|almirante||PA|8q|69e|1zrc|-hnsw|j64591
Alor Setar|alor setar||MY|tx|77mj|1b65|lihd|j64bgn
Alotau|alotau||PG|13k|8yw|-27hp|w8y7|j64bq1
Alpena|alpena||US|13e|e56|9np4|-hvrr|j643cx
Alpine|alpine||US|1ph|52z|6i9j|-m7vu|j6421z
Alta|alta||NO|ji|9bh|ezv6|4zc1|j64j4j
Alta Floresta|alta floresta||BR|12q|v82|-24e0|-bzek|j64m0p
Alta Gracia|alta gracia||AR|fn|v5s|-6sag|-dt58|j647ux
Altagracia de Orituco|altagracia de orituco||VE|mj|uwk|2408|-e86w|j6499v
Altai|altai|altay|MN|lj|p2g|9xzt|kjjm|j64jfd
Altamira|altamira||BR|1bz|1ip4|-oos|-b6us|j64god
Altata|altata||MX|1kj|rs|5a3c|-n4oq|j645sj
Altay|altay|altay city|CN|1v2|31kg|a9ca|ivwu|j64lrt
Altdorf|altdorf||CH|1s1|6p2|a1py|1ung|j63ulf
Alto Rio Sanguer|alto rio sanguer|alto rio senguer|AR|dv|170|-9nh9|-f6jx|j647pd
Alton|alton||US|pl|1t10|8c32|-jbv6|j6491l
Altoona|altoona||US|1cd|1onj|8on6|-gswe|j64357
Alvorada|alvorada||BR|1q5|7w8|-2o7w|-aipw|j64m0d
Alwar|alwar||IN|1fe|62jg|5wji|gf35|j64ga1
Alxa Zuoqi|alxa zuoqi|alxa left banner|CN|16t|17ib|8bom|mnce|j64f05
Am Timan|am timan||TD|1hi|nhn|2d4t|4ci9|j64knh
Amahai|amahai|kota masohi|ID|116|10rp|-poh|rmwt|j64dnb
Amapá|amapa||BR|2n|1i3|ftg|-avz4|j64l0h
Amaravati|amaravati||IN|33|3gbb4|3jkp|h9bv|sm0fv1
Amarillo|amarillo||US|1ph|3w92|7ju4|-ltq4|j64lan
Amasya|amasya||TR|2p|1ryo|8pop|7ohm|j64afx
Ambala|ambala||IN|ni|359f|6hy8|ggqw|j646s5
Ambanja|ambanja||MG|3e|nml|-2xkt|aduc|j64bo3
Ambarchik|ambarchik||RU|1hd|0|exfi|ysko|j64lkx
Ambato|ambato||EC|16c|615d|-9so|-gumw|j64e4f
Ambatondrazaka|ambatondrazaka||MG|1q4|xa6|-3tll|adl3|j64bov
Ambler|ambler||US|26|76|edn5|-xtzm|j649k1
Ambon|ambon||ID|116|7mdo|-sof|rh74|j64lo1
Ambriz|ambriz||AO|7t|d48|-1oly|2t9u|j64l35
Amderma|amderma||RU|16v|7u|eyam|d7tx|j64kf3
Americana|americana||BR|1nj|a9yo|-4vjf|-a578|j64801
Ames|ames||US|q1|1828|90hn|-k2dh|j648ot
Amherst|amherst||CA|193|77c|9tiu|-drhy|j647np
Amiens|amiens||FR|1d4|32em|ap18|hqw|j64fqd
Amman|amman||JO|2s|mpwg|6ujk|7p8y|j64mhj
Amol|amol||IR|12w|4r0y|7tex|b81d|j64g5n
Amos|amos||CA|1fa|844|aeqq|-gqr3|j647mp
Amravati|amravati||IN|10w|fqpf|4hng|go2s|j64jpj
Amritsar|amritsar||IN|1ei|pz6o|6s5f|g1oo|j64mm7
Amsterdam|amsterdam||NL|180|m3iw|b7y7|11x7|j64n1b
Amundsen–Scott South Pole Station|amundsen scott south pole station|amundseniscott south pole station|AQ||5k|-jag0|11xp5|j64ivf
Amursk|amursk||RU|ub|109d|aris|tcb2|j64cr7
An Nabk|an nabk|nabk|SA|1k|7ps|6prp|802d|j63vjt
An Nasiriyah|an nasiriyah|nasiriya|IQ|gh|9oez|6nj1|9x04|j64g6t
Anaco|anaco||VE|3i|2iqk|20u8|-dtdk|j6437b
Anadyr|anadyr||RU|dw|7z0|dvii|121em|j64me7
Anápolis|anapolis||BR|l8|6ulf|-3hx8|-ahs0|j64hcv
Añatuya|anatuya||AR|1iv|awl|-63n9|-dgtp|j64hhf
Anbyon|anbyon||KP|so|tfi|8d56|rbxu|j6464z
Anchorage|anchorage||US|26|5ku3|d4dk|-w4my|j64mtt
Ancona|ancona||IT|11x|25jv|9cf8|2w5z|j64dsz
Ancud|ancud||CL|zd|lmc|-8z2k|-ftoc|j64krf
Anda|anda||CN|nw|3w2l|9y0w|quz4|j646nz
Andamooka|andamooka||AU|1lj|eo|-6it2|tedk|j64ifx
Anderson|anderson||US|1ll|1bhy|7e8d|-hpqf|j6490z
Andijan|andijan|andijon,andizhan|UZ|34|dxjk|8qqk|fi6g|j64lcz
Andkhvoy|andkhvoy|andkhoy|AF|ja|1jci|7wyt|dybr|j64hpd
Andoany|andoany||MG|3e|hi0|-2ve8|acfe|j64klb
Andoas|andoas||PE|za|a|-me5|-gdix|j64b1p
Andong|andong||KR|fp|2rs7|7u57|rl8y|j64aij
Andorra|andorra|andorra la vella|AD||15ny|93xk|bp9|j64l5t
Andradina|andradina||BR|1nj|14fq|-4hc8|-b0g7|j64hk3
Androka|androka||MG|1qc|4u|-5d2j|9g31|j64klt
Ang Thong|ang thong||TH|35|alm|34ix|lj2s|j63uzz
Angangxi|angangxi|ang angxi|CN|nw|irh|a3w1|qj8w|j646ob
Angarsk|angarsk||RU|q6|57me|b9k0|m9uo|j64lkd
Angeles|angeles||PH|1bm|6qnx|38uz|pu4r|j64kgn
Angers|angers||FR|1c6|41cs|a6cw|-438|j646tb
Angoche|angoche||MZ|165|18mj|-3h8c|8jy4|j64kcb
Angol|angol||CL|x1|ym0|-83l8|-fl18|j646wf
Angra do Heroísmo|angra do heroismo||PT|5f|9al|8a88|-5u07|j64b5n
Angren|angren||UZ|1ox|4bx2|8slc|f1bh|j649sn
Aniak|aniak||US|26|dx|d757|-y6vq|j649j7
Ankang|ankang||CN|1jm|nkrk|705s|nd7c|j64ls1
Ankara|ankara||TR|37|27na8|8k3g|71kg|j64mtz
Anlu|anlu||CN|ox|1ixq|6pa4|od30|j646jt
Ann Arbor|ann arbor||US|13e|5p88|92e4|-hxzk|j649av
Anna Regina|anna regina||GY|fl|2eh|1k3k|-cje1|j64a7n
Annaba|annaba||DZ|38|asis|7wvk|1nvk|j64m4l
Annapolis|annapolis||US|129|1qqc|8crb|-ge7x|j6432n
Annecy|annecy||FR|1fv|29lh|9u60|1b73|j646a3
Anqing|anqing||CN|36|cfwx|6jc8|p35w|j64jgz
Ansan|ansan||KR|mm|fulh|806h|r6ur|j644jl
Anshan|anshan|anshan liaoning|CN|yg|z4ns|8t9e|qclh|j64lsn
Anshun|anshun||CN|mg|i73c|5mkb|mpch|j64jgj
Antakya|antakya|antioch|TR|nl|3bg3|7rkt|7qof|j63tp7
Antalaha|antalaha||MG|3e|10fs|-36u9|arzl|j64kl7
Antalya|antalya||TR|3a|gs60|7wnr|6kv8|j64k3p
Antananarivo|antananarivo||MG|3b|10dew|-41y3|a6mj|j64mib
Antigonish|antigonish||CA|193|577|9s25|-dadq|j64h6v
Antigua Guatemala|antigua guatemala||GT|1gx|udk|34eb|-jg3p|j63xjp
Antofagasta|antofagasta||CL|3d|6n2g|-52hg|-f37k|j64mkx
Antsirabe|antsirabe||MG|3b|6lld|-495w|a2wt|j64kl5
Antsiranana|antsiranana||MG|3e|1rzt|-2mq5|akhn|j64lpp
Antsohihy|antsohihy||MG|10u|gfe|-36ph|aa8q|j64bop
Antwerpen|antwerpen|antwerp|BE|3f|jpvk|az8f|y1v|j64k3d
Anuradhapura|anuradhapura||LK|3g|2ja6|1sfg|h88p|j64kgb
Anxi|anxi||CN|kc|dsu|8oi4|kj74|j64dut
Anyang|anyang||CN|nx|j0ew|7qer|oibd|j64jl3
Anzhero Sudzhensk|anzhero sudzhensk||RU|u0|1sks|c0ps|ifw0|j645l5
Aomori|aomori||JP|3j|6e8q|8r0a|u5q4|j64joj
Aosta|aosta||IT|1si|qa6|9swq|1kfy|j63woh
Apalachicola|apalachicola||US|jl|1rg|6dd4|-i7t1|j648yt
Apatity|apatity||RU|157|1fmj|eheb|75nu|j645ap
Apatzingán|apatzingan||MX|13f|23xy|4380|-lxqk|j645vh
Apia|apia||WS||1brw|-2ysv|-10t56|j64msd
Apodi|apodi||BR|1fz|cxh|-17lg|-83o0|j647gf
Apolo|apolo||BO|x6|38d|-35ks|-enxk|j64huz
Appenzell|appenzell||CH|3l|4cx|a585|20nr|j63wf7
Appleton|appleton||US|1uw|4d5d|9hkv|-iy3p|j6430f
Apsheronsk|apsheronsk||RU|vz|zec|9j4f|8ijr|j645g5
Apucarana|apucarana||BR|1bw|2aml|-51po|-b158|j647bh
Aqadyr|aqadyr||KZ|1er|7hq|achp|fm6v|j64633
Aqsay|aqsay|aksay|KZ|1uh|qun|ayua|bd7x|j64g1j
Aqsu|aqsu|aksu|KZ|3q|6lb|b8pi|ff8t|j64g25
Aqtau|aqtau|aktau|KZ|11g|3gf|9clk|azcd|j64kuf
Aqtobe|aqtobe|aktobe,aktyubinsk|KZ|3s|5mih|aryo|c94k|j64ly1
Aquidauana|aquidauana||BR|12r|vhf|-4dy0|-byh8|j64gpd
Ar Ramadi|ar ramadi|ramadi|IQ|1z|6bpt|75vc|9a3s|j6473j
Ar Raqqah|ar raqqah|raqqa|SY|3u|3t2c|7p8o|8d2w|j649ft
Ar Rutbah|ar rutbah|ar rutba|IQ|1z|h9e|72xd|8mu5|j64gl7
Aracaju|aracaju||BR|1jj|eoto|-2c3s|-7yf4|j64kyj
Aracati|aracati||BR|c8|y6d|-z6o|-83fo|j64kxn
Araçatuba|aracatuba||BR|1nj|3n6w|-4jno|-at9w|j64k3b
Araçuaí|aracuai||BR|13l|gz9|-3m38|-90m3|j64gr1
Arad|arad||RO|3w|3mg9|9w90|4ki8|j644qj
Araguaína|araguaina||BR|1q5|12x8|-1jh8|-abzo|j64kwx
Araguari|araguari||BR|13l|22id|-3zts|-abww|j64787
Arak|arak||IR|123|asm7|7ays|anhk|j64g7b
Arak|arak||DZ|1ob|92kz|5f28|sxo|j64l45
Aral|aral||KZ|1fb|ph5|a140|d7tm|j64ktv
Aranyaprathet|aranyaprathet||TH|1gs|hc8|2xko|lyvd|j649x1
Araouane|araouane||ML|1pw|33u|41u0|-r8j|j64kql
Arapiraca|arapiraca||BR|24|40t0|-238c|-7uy4|j64kxx
Arapongas|arapongas||BR|1bw|238o|-50ms|-b0u4|j647av
Arar|arar|ar ar|SA|1f|4rb4|6n4c|8sin|j64b8d
Araranguá|ararangua||BR|1im|xis|-67aw|-aly0|j647cj
Ararat|ararat||AU|1t8|4pq|-7znf|ump8|j64ihb
Arawa|arawa||PG|18m|v2i|-1c20|xccs|j63vyj
Araxá|araxa||BR|13l|1rqb|-472s|-a29o|j64gq1
Arba Minch|arba minch||ET|1m3|1hpy|1als|81qk|j64kt3
Arcata|arcata||US|bb|g4p|8rh0|-qlgy|j648fx
Archangel|archangel|arkhangelsk|RU|4a|7mqb|du9i|8oui|j64med
Arcoverde|arcoverde||BR|1cj|183v|-1syw|-7y18|j6482t
Arctic Bay|arctic bay||CA|19e|gs|fnj1|-i95e|j64mo1
Ardabil|ardabil||IR|43|8vwr|8750|acoo|j64ku5
Ardmore|ardmore||US|1a3|j9c|7bqr|-ktge|j641uj
Arecibo|arecibo||PR||1hh7|3ya8|-eaw4|j64l57
Arendal|arendal||NO|56|nus|cj48|1vn0|j63vnz
Arequipa|arequipa||PE|44|hguw|-3iok|-fby0|j64lex
Arezzo|arezzo||IT|1qi|1yo5|9bcp|2jmm|j64dr3
Argentia|argentia||CA|179|tj|a4z0|-bkl8|j64h7d
Århus|arhus|aarhus|DK|13i|53an|c1b8|26sb|j64kuz
Arica|arica||CL|47|3zin|-3yqw|-f2d0|j64lwf
Aripuanã|aripuana||BR|12q|ktj|-26iv|-cqo7|j64kxb
Ariquemes|ariquemes||BR|1gd|18ts|-24p0|-diq8|j64gov
Arjona|arjona||CO|8y|12w5|2760|-g5ek|j646e7
Arlington|arlington||US|1ph|fj8p|7074|-ksm2|j6425l
Arlit|arlit||NE|n|255s|417s|1kk4|j64ka7
Armavir|armavir||RU|vz|49z0|9n84|8td0|j64c4t
Armenia|armenia||CO|1f7|6rb4|yzj|-g7yj|j64e8h
Armidale|armidale||AU|176|hht|-6jfn|wi9v|j64m5x
Arnhem|arnhem||NL|km|31be|b554|19pa|j63vl5
Arqalyq|arqalyq|arkalyk|KZ|1ew|16u9|aro2|ec6o|j64jrn
Arras|arras||FR|185|1did|arzl|lh5|j646u5
Arrecife|arrecife||ES||14uo|67iy|-2wgi|j64it5
Arroyos y Esteros|arroyos y esteros||PY|ex|2cv|-5dac|-c8ic|j644wx
Arsenyev|arsenyev||RU|1e5|19ak|9grb|skev|j645ol
Artashat|artashat||AM|40|fv6|8kab|9jr6|j63z0d
Artemisa|artemisa||CU|x3|1gix|4w12|-hqlf|j64ebz
Artemovsk|artemovsk|artyomovsk|RU|w0|3tg|bncv|k0yb|j64cn5
Artemovskiy|artemovskiy|artyomovsky|RU|1nc|yhd|cams|d9e2|j64ca5
Artigas Base|artigas base||AQ||1o|-dbqj|-cm73|j6489n
Artvin|artvin|coruh|TR|4c|owg|8trq|8yo4|j63tqx
Arua|arua||UG|4d|5cwg|nb0|6mfc|j64al5
Arusha|arusha||TZ|4f|7b80|-pxc|7uy4|j64lnp
Arvaikheer|arvaikheer|arvayheer|MN|1xb|ln9|9wv8|m0ya|j64jft
Arviat|arviat||CA|19e|1fw|d3im|-k5re|j64m21
Arxan|arxan||CN|16t|opj|a42h|ppo2|j64jnj
Arys|arys||KZ|1lr|wwo|93g1|eqwg|j64ga5
Arzamas|arzamas||RU|17t|3211|bvgw|9dyo|j645cb
As Salt|as salt|salt|JO|6a|30k1|6v7s|7no8|j6468b
As Samawah|as samawah|samawah|IQ|21|3r0i|6pl7|9pdv|j64g6n
As Sidr|as sidr|sidra|LY|1n8|1e|6knk|3wy2|j64ded
As Sulaymaniyah|as sulaymaniyah|sulaymaniyah|IQ|4i|fi02|7me5|9qjp|j64g8b
As Sulayyil|as sulayyil|as sulayyil governorate|SA|3v|ild|4dvz|9rmy|j64kbn
As Suwayda|as suwayda|al suwayda|SY|4g|1jqw|70bg|7u5e|j649gf
Asadabad|asadabad||AF|w9|11cg|7h10|f8zw|j63z8f
Asahikawa|asahikawa||JP|of|7n5w|9dm6|uim0|j64job
Asansol|asansol||IN|1ud|sgow|52r9|in5i|j64mmd
Asbest|asbest||RU|1nc|1qow|c7zq|d67o|j645ij
Ascension|ascension||BO|1in|b4t|-3d50|-diq8|j64hwt
Ascensión|ascension||MX|db|939|6nyw|-n56g|j645rv
Asela|asela|asella|ET|g|1rgg|1pcg|8e07|j64fyd
Ash Shatrah|ash shatrah||IQ|gh|3gyl|6qf3|9wb0|j6470t
Ash Shihr|ash shihr||YE|n0|15vm|35vt|amsc|j6441z
Asha|asha||RU|d0|u03|bsd8|c9x2|j64c7t
Ashburton|ashburton||NZ|bn|dno|-9epz|10t7y|j64n4v
Asheville|asheville||US|18e|325f|7mp8|-hozp|j6493f
Ashgabat|ashgabat||TM|s|flhw|84to|cihl|j64mav
Ashtarak|ashtarak||AM|3x|ehn|8myx|9ia0|j63yy1
Asino|asino||RU|1qg|kvy|c7rf|igu3|j64bvf
Asmara|asmara||ER|39|db0i|3ab9|8cet|j64mjd
Asosa|asosa||ET|7w|njk|25oe|7egl|j64fyv
Assab|assab||ER|g5|29eg|2sdw|95pg|j64lrf
Assen|assen||NL|hc|1c0t|bcy8|1ejg|j63vkj
Assis|assis||BR|1nj|1vhr|-4uuc|-at1k|j64hjn
Asti|asti||IT|1d6|1izw|9mok|1rck|j6468j
Astoria|astoria||US|1ai|7q3|9we4|-qjh8|j648m3
Astrakhan|astrakhan||RU|4p|arr9|9xmn|aasm|j64lj5
Asunción|asuncion||PY|4q|142wg|-5f69|-ccs3|j64mcd
Aswan|aswan||EG|4s|6puq|55uz|71ul|j64lr7
Asyut|asyut||EG|4t|90ix|5tss|6ol3|j64lrb
At Bashy|at bashy|at bashi|KG|16g|c1d|8tot|g8uo|j64bev
At Tafilah|at tafilah|tafilah|JO|1o0|jmd|6lwt|7mow|j63wnd
At Taif|at taif|ta if|SA|111|e35u|4k26|8nlb|j6451d
Atafu|atafu||NZ|1q8|ek|-1tym|-10z01|j64n7f
Atakpamé|atakpame||TG|1dc|1q97|1m3o|8n4|j64lc1
Atamyrat|atamyrat|kerki|TM|cw|pne|83uw|dz31|j649rp
'Ataq|ataq||YE|1jp|ssj|349o|a140|j640at
Atar|atar||MR|j|y5l|4eb2|-2sp0|j64mlf
Atasu|atasu||KZ|1er|f4w|afp3|fcur|j64g2t
Atbarah|atbarah|atbara|SD|1g4|3m3o|3sng|7a6w|j64kav
Atbasar|atbasar||KZ|3q|rmz|b3uz|endh|j64jrx
Athabasca|athabasca||CA|29|1yj|bq76|-o9yy|j64gzt
Athens|athens|athinai|GR|53|1xhjk|853h|5342|j64n21
Athens|athens||US|kn|2d3x|7a1p|-hvck|j648zb
Atherton|atherton||AU|1f2|5db|-3p9b|v6g6|j64in1
Ati|ati||TD|79|jkt|2tzf|3xgl|j64eef
Atikokan|atikokan||CA|1aa|2sp|ag5s|-jmx2|j64h51
Atka|atka||US|26|1p|b6r1|-11c51|j649hz
Atkarsk|atkarsk||RU|1iz|l9e|b4a5|9n6x|j64cdd
Atlanta|atlanta||US|kn|2okuo|791s|-i38z|j64n0h
Atlantic City|atlantic city||US|174|1n31|8fqm|-fy95|j6496v
Atlixco|atlixco||MX|1ee|23hu|41u0|-l3n8|j645w5
Atoyac|atoyac|atoyac de alvarez|MX|me|ftv|3ops|-lix8|j645y5
Atqasuk|atqasuk||US|26|5l|f3qu|-xqh2|j643lj
Attapu|attapu|attapeu|LA|52|3bd|369c|mwdi|j63y9v
Attawapiskat|attawapiskat||CA|1aa|1e2|bcb2|-ho25|j64k21
Atyrau|atyrau||KZ|54|3x0h|a3iv|b4m8|j64ly7
Auburn|auburn||US|23|1l1l|6zm9|-ibko|j642bf
Auckland|auckland||NZ|55|tink|-7wbl|11gha|j64n6f
Augsburg|augsburg||DE|7i|7ozx|ad2k|2c3s|j646h7
Augusta|augusta||US|kn|5mf0|766o|-hklm|j64jvl
Augusta|augusta||US|10z|iju|9hwi|-eyfc|j64lbx
Aurangabad|aurangabad||IN|10w|nuso|49j4|g55s|j64l7t
Aurangabad|aurangabad||IN|86|220p|5b4o|i32w|j64gdd
Aurora|aurora||US|ei|clck|8ian|-mgph|j641gt
Aurora|aurora||US|pl|7i28|8y9i|-ixbs|j6492d
Austin|austin||US|1ph|ovu0|6hk1|-ky7b|j64lal
Autlan|autlan|autlan de navarro|MX|qp|10s5|48jo|-mdbo|j645v3
Auxerre|auxerre||FR|9c|w18|a8tw|riq|j64fot
Avaré|avare||BR|1nj|1qpx|-4ybg|-ahjo|j64815
Avarua|avarua||CK||479|-4jju|-y8wu|j64l63
Aveiro|aveiro||PT|5a|15si|8pl6|-1ur2|j63vc5
Awasa|awasa||ET|1m3|2up5|1ih4|88w2|j640op
Aweil|aweil||SS|18d|101d|1vn6|5vf4|j64k81
Awjilah|awjilah|awjila|LY|y|53m|68lk|4k91|j64ksh
Awka|awka||NG|2y|apsw|1bx4|1ijw|j64d97
Ayacucho|ayacucho||PE|5b|3kbu|-2tnq|-fwoo|j64j3h
Ayakoz|ayakoz|ayagoz|KZ|hw|zdx|aa3j|h8ll|j64jsd
Ayan|ayan||RU|ub|zq|c3lq|tm3t|j64jd5
Ayapel|ayapel||CO|fn|i8n|1sa0|-g3v0|j64e5f
Ayaviri|ayaviri||PE|bc|ewe|-36t8|-f4r4|j64azv
Aybak|aybak|samangan|AF|1hn|iio|7rsi|el00|j63zb1
Aydın|aydin||TR|5c|49ft|841w|5yw4|j644ev
Ayorou|ayorou|ayerou|NE|17d|kaa|35o6|73f|j64awt
Ayoun el Atrous|ayoun el atrous||MR|oe|13j|3klm|-227b|j64lx1
Ayr|ayr||GB|1lk|1h9u|bvuw|-zmf|j64abl
Ayr|ayr||AU|1f2|706|-4706|vlcb|j64imx
Ayutla|ayutla|ayutla de los libres|MX|me|7mx|3mek|-l9l4|j64d1b
Ayutthaya|ayutthaya|phra nakhon si ayutthaya|TH|1cx|34cv|32sk|ljzo|j649v5
Az Aubayr|az aubayr|az zubayr|IQ|20|5mbv|6ihg|a848|j6470l
Az Zahran|az zahran|dhahran|SA|4j|236u|5mv6|ar0v|j64547
Az Zarqa|az zarqa|zarqa|JO|1wc|j6cj|6vgc|7qjs|j6468f
Az Zawiyah|az zawiyah|zawiya|LY|5e|4abk|70s4|2q5c|j64dd1
Azare|azare||NG|7d|29jr|2i4k|26mk|j64d9h
Azogues|azogues||EC|c7|1hb3|-l54|-gwc0|j646av
Azua|azua||DO|5g|19mr|3ye4|-f5qy|j63xqz
Azul|azul||AR|e4|15md|-7vsk|-ctyk|j64hf5
B'abda|b abda|baabda|LB|14s|6y0|7925|7m6d|j63y2v
Babahoyo|babahoyo||EC|zf|1muv|-dvw|-h1qg|j64e3n
Babanusa|babanusa||SD|1lt|f78|2fg6|5yi8|j64kiv
Babati|babati||TZ|4f|qgj|-wk3|7nuk|j64atb
Babruysk|babruysk||BY|10y|4q5h|bdxe|6994|j64i3n
Bắc Giang|bac giang|phu lang thuong|VN|5i|15gg|4k3i|mrg0|j649yz
Bắc Kạn|bac kan||VN|1x6|mjv|4qs5|mom5|j63tan
Bạc Liêu|bac lieu||VN|5j|4tm0|1zlw|mnqo|j64a1l
Bacabal|bacabal||BR|11w|1juc|-wn0|-9log|j64jzz
Bacău|bacau||RO|5p|4a2c|9zeg|5rpo|j64ayj
Bacolod|bacolod||PH|16s|kciy|2a19|qcxl|j64kgf
Badajoz|badajoz||ES|j0|304l|8c04|-1hs4|j64a8p
Baddeck|baddeck||CA|193|no|9vpk|-d0s4|j647nv
Bade|bade||TW|1ok|3orl|5ckn|pzy5|j640uh
Badulla|badulla||LK|5t|10pv|1hvx|hddv|j64ahn
Bærum|baerum||NO|z|2fp7|cuan|2fk0|j63vpj
Bafang|bafang|baham|CM|1b6|1zvd|13w8|26js|j64h87
Bafatá|bafata||GW|5u|mx4|2lvq|-355w|j64dpd
Bafia|bafia||CM|ce|1hg6|10nk|2eng|j64hlx
Bafoulabé|bafoulabe||ML|tq|kp3|2yhg|-2bhk|j64d53
Bafoussam|bafoussam||CM|1b6|68cw|16d4|28bn|j64h8h
Bafra|bafra||TR|1ht|2370|8wqq|7p25|j64agb
Bafwasende|bafwasende||CD|1an|45|8d2|5ue2|j64ejb
Bagamoyo|bagamoyo||TZ|1em|1rlm|-1dos|8c2s|j64arf
Bagdarin|bagdarin||RU|af|3lw|bo0d|ocjk|j64jaf
Bagé|bage||BR|1g0|29v6|-6po0|-blfs|j64kxh
Baghdad|baghdad||IQ|5w|30bow|759a|9ij3|j64n23
Baghlan|baghlan||AF|5x|4osc|7qup|eq35|j64k3h
Baglung|baglung||NP|gg|hz4|623v|hwxl|j63vrf
Bago|bago|pegu|MM|5y|63dq|3pn4|kopq|j64k7h
Baguio|baguio|baguio city|PH|7v|9ljk|3irw|pubn|j64lk5
Bahawalpur|bahawalpur||PK|1ei|bue7|6arw|fd1q|j64j4z
Bahía Blanca|bahia blanca||AR|e4|618g|-8ax4|-dcfu|j64mpn
Bahir Dar|bahir dar||ET|2r|4fj0|2hi9|80g9|j64lxn
Bahraich|bahraich||IN|1sa|3wlm|5x4c|hi63|j64gb7
Baia Mare|baia mare||RO|11u|2xd5|a7qr|51xr|j64axz
Baicheng|baicheng||CN|r8|8ai5|9s08|qboo|j64jn5
Baie-Comeau|baie comeau||CA|1fa|81v|ajsz|-elws|j647m5
Baiquan|baiquan|baiquan county|CN|nw|1idk|a7aq|r0ur|j646on
Bairin Zuoqi|bairin zuoqi|baarin left banner|CN|16t|12kw|9fdp|pjmi|j64f0j
Bairnsdale|bairnsdale||AU|1t8|8hp|-83w8|vmys|j64ihj
Baishan|baishan||CN|r8|72mo|8zaw|r3jg|j646ml
Bajram Curri|bajram curri||AL|w5|65b|92n9|4ayp|j63ypj
Bakal|bakal||RU|d0|khr|bryr|clo7|j645hn
Baker Lake|baker lake||CA|19e|180|ds9u|-kkvb|j64h1z
Bakersfield|bakersfield||US|bb|9hx5|7kx0|-pid4|j64jtt
Baku|baku||AZ|64|19hks|8npg|aoq3|j64mqb
Balakhna|balakhna||RU|17t|1cob|c3wv|9cdk|j645c3
Balakovo|balakovo||RU|1iz|49zo|b5gs|a8ts|j64j7l
Balancán|balancan||MX|1ns|96f|3tcg|-jm90|j645wp
Balashov|balashov||RU|1iz|23p7|b1sf|991r|j64cdh
Balboa|balboa||PA|1bn|1ciq|1x24|-h1xv|j64j5l
Balcarce|balcarce||AR|e4|emv|-83x9|-chgk|j647tx
Balıkesir|balikesir||TR|67|5lsc|8hy0|5z78|j64ae1
Balikpapan|balikpapan||ID|sa|9k29|-9n8|p1gs|j64lpl
Balkanabat|balkanabat||TM|68|2dij|8gvo|bnhd|j649qp
Balkh|balkh||AF|69|3uv5|7vkd|ec79|j64hp3
Ballarat|ballarat||AU|1t8|1to5|-81t8|utvk|j64ii5
Ballari|ballari|bellary|IN|t6|9jnw|38wc|ghha|j64kq7
Ballina|ballina||AU|176|azm|-66p2|wwxs|j64idt
Balqash|balqash|balkhash|KZ|1er|1qs4|a1is|g2bi|j64js7
Balsas|balsas||BR|11w|1gig|-1m0w|-9vbo|j64kwf
Baltasar Brum|baltasar brum||UY|4b|1xx|-6l44|-caa8|j640y7
Bălți|balti||MD|6b|38sb|a8if|5zbh|j64bs3
Baltimore|baltimore||US|129|1cbyw|8f97|-gf7v|j64lbn
Balykchy|balykchy||KG|1vp|v9r|93lc|gbum|j64bep
Balyqshy|balyqshy||KZ|54|oeg|a362|b47e|j64jrv
Bam|bam||IR|u6|24lg|68lh|cibo|j64jsj
Bama|bama||NG|94|2j55|2gw4|2xms|j64d6p
Bamako|bamako||ML|6d|w0s0|2pmg|-1pqs|j64mld
Bambari|bambari||CF|1b1|1bwy|18gk|4fgw|j64m2p
Bamenda|bamenda||CM|184|9jlf|19zk|26bg|j64m3v
Bamian|bamian|bamyan|AF|6g|1bqf|7goj|egzu|j64k3f
Ban Houayxay|ban houayxay||LA|8t|4wb|4cgn|lisg|j63y6h
Banamba|banamba||ML|6d|nlr|2wk0|-1lhg|j64d4p
Banda Aceh|banda aceh||ID|7|b0de|16to|kfhs|j64loj
Bandar-e-Abbas|bandar e abbas|bandar abbas|IR|ok|9w3f|5twp|c275|j64lyp
Bandar-e Bushehr|bandar e bushehr|bushehr|IR|ah|3mg4|675c|aw7g|j64ku1
Bandar Lampung|bandar lampung|tanjungkarang telukbetung|ID|xs|iweh|-161s|mki0|j64e0b
Bandar Lampung|bandar lampung||ID|xs|ijfs|-15vt|mk95|j64lq1
Bandar Seri Begawan|bandar seri begawan||BN|9w|6cs4|11oh|omtx|j64mp7
Bandarbeyla|bandarbeyla|bayla|SO|6u|am1|2169|aw3r|j64kg1
Bandjarmasin|bandjarmasin|bandjermasin,banjarmasin|ID|s8|cxq0|-pp0|ok3t|j64mih
Bandundu|bandundu||CD|6i|2j7n|-pjg|3q3s|j64luf
Bandung|bandung||ID|qu|1fb80|-1hm1|n201|j64mw7
Banes|banes||CU|og|14z4|4hr1|-g88y|j64e83
Banff|banff||CA|29|5se|ayw4|-orrb|j64kz5
Banfora|banfora||BF|vl|1aio|2a0w|-10q8|j64ioj
Bangassou|bangassou||CF|12y|pc9|10iy|4w1y|j64h9z
Banghazi|banghazi|benghazi|LY|7r|pahs|6vtv|4atk|j64mll
Bangkok|bangkok|krung thep|TH|6k|3zou8|2y3z|ljkr|j64n11
Bangor|bangor||US|10z|12qt|9los|-eqp3|j64jx3
Bangui|bangui||CF|6l|htx1|xoy|3z73|j64mpz
Baní|bani||DO|1cg|1fh1|3x1s|-f2oe|j63xs1
Bani Walid|bani walid||LY|6n|1egg|6t54|2zy4|j64ddh
Banja Luka|banja luka||BA|1ji|4r3e|9lj0|3ok8|j64iox
Banjul|banjul||GM|6o|x92|2vt7|-3k0t|j64lv1
Bannu|bannu||PK|15m|dc9f|72jm|f4qq|j64bfl
Bansang|bansang||GM|10d|5vj|2vnk|-351g|j64fdp
Banská Bystrica|banska bystrica||SK|6p|1rj4|ag11|43rg|j6452d
Banyuwangi|banyuwangi||ID|qw|3p1k|-1r8e|oihc|j64e0x
Baoding|baoding||CN|nu|nq60|8bxw|or19|j64et3
Baoji|baoji||CN|1jm|h5a8|7da0|myrw|j64jjb
Baoshan|baoshan||CN|1vt|lfls|5dts|l91o|j64lsf
Baotou|baotou||CN|16t|17mzk|8pou|njdl|j64mxv
Baqubah|baqubah|ba qubah|IQ|gx|6f2v|78ec|9kkt|j64g8f
Bar Harbor|bar harbor||US|10z|4p6|9ihz|-em9o|j649ah
Barabinsk|barabinsk||RU|195|ob8|bv51|gskf|j64chz
Barahona|barahona|santa cruz de barahona|DO|6s|1xjk|3wfo|-f8m0|j64fd5
Baraki Barak|baraki barak||AF|z3|h7l|7a37|es5f|j63zaf
Baramula|baramula|baramulla|IN|qr|3lma|7bw4|fxos|j64fhh
Baranavichy|baranavichy||BY|9n|3m84|be08|5kpy|j6487h
Barbacena|barbacena||BR|13l|2mar|-4jqg|-9dqc|j6476v
Barcaldine|barcaldine||AU|1f2|to|-51u6|v50i|j64ijf
Barcelona|barcelona||ES|c3|2xgao|8vbw|gty|j64mu5
Barcelona|barcelona||VE|3i|cvp6|2660|-dvds|j64997
Barcelos|barcelos||BR|2q|9pk|-7iu|-dhiv|j64kvp
Barclayville|barclayville||LR|lu|23x|111c|-1r0j|j63wih
Barddhaman|barddhaman|bardhaman|IN|1ud|6gt9|4zeg|ityy|j64jsv
Bareilly|bareilly||IN|1sa|hieg|62q9|h0sl|j64gbv
Bari|bari||IT|3m|aq8x|8t8m|3m6w|j64drl
Bariloche|bariloche|san carlos de bariloche|AR|1go|21lu|-8tik|-fa5k|j64m37
Barinas|barinas||VE|6w|63cx|1ucw|-f21w|j6426j
Barishal|barishal|barisal|BD|6x|4c1u|4v5o|jdc6|j64i4j
Barlett|barlett|bartlett|US|1pd|6507|7js5|-j97v|j642wb
Barletta|barletta||IT|3m|2b7a|8uts|3hjg|j6467x
Barnaul|barnaul||RU|2h|cumz|bfou|hy6i|j64mev
Barquisimeto|barquisimeto||VE|xx|nx40|25k7|-euqj|j64iz1
Barra do Bugres|barra do bugres|bugres|BR|12q|o5r|-38a0|-c9a4|j64grn
Barra do Corda|barra do corda|corda|BR|11w|11qd|-16ig|-9p88|j64gmv
Barra do Garças|barra do garcas|garcas|BR|12q|14fi|-3ej0|-b78o|j64grf
Barra Mansa|barra mansa||BR|1g1|3mp6|-4u2o|-9gtf|j647fj
Barrancabermeja|barrancabermeja||CO|1iq|43or|1ipg|-fttw|j646bl
Barranquilla|barranquilla||CO|4y|12jcg|2ckz|-g16b|j64lqt
Barras|barras||BR|1d3|gnx|-wsk|-92e0|j647ed
Barreiras|barreiras||BR|5z|3e50|-2lo8|-9n80|j64m17
Barreiros|barreiros||BR|1cj|rfx|-1w4o|-7jls|j64hkd
Barretos|barretos||BR|1nj|263o|-4ekc|-aeug|j6481n
Barrie|barrie||CA|1aa|3wgp|9igu|-h2yw|j64h4b
Barstow|barstow||US|bb|gan|7ha6|-p2y3|j648g5
Bartica|bartica||GY|1dl|8w4|1dgo|-cke4|j64a7j
Bartlesville|bartlesville||US|1a3|qpe|7vjk|-kkla|j641tn
Baruun-Urt|baruun urt||MN|1np|c71|a0c8|oa3l|j64jfv
Barysaw|barysaw||BY|13n|3bwd|bmes|63ui|j64i45
Basankusu|basankusu||CD|f7|14ag|9ip|48s0|j64ed7
Base Presidente Montalva|base presidente montalva|base presidente eduardo frei montalva,formerly teniente rodolfo marsh station|AQ||46|-dbsz|-cmj9|j64iuf
Basel|basel||CH|71|hsfk|a74s|1mkc|j64au5
Basoko|basoko||CD|1an|xq5|9kk|520s|j64ejn
Basra|basra|al basrah|IQ|20|inao|6jgj|a8x0|j64lyn
Bassar|bassar||TG|sv|1bpx|1zgi|636|j63t3j
Basse Santa Su|basse santa su||GM|1rx|b3g|2up8|-31qu|j63xwn
Basse-terre|basse terre||GP|m1|8j|3fjc|-d84f|j64glp
Basseterre|basseterre||KN||gvz|3pi4|-dfxe|j64m77
Bastia|bastia||FR|f3|vmx|95i0|20x0|j64fnx
Bata|bata||GQ|yy|3piu|efg|23dw|j64knb
Batagay|batagay||RU|1hd|3ai|ei1c|suum|j64lkz
Batangas|batangas|batangas city|PH|76|93jw|2yc9|pxt5|j64kgp
Batatais|batatais||BR|1nj|143s|-4h6s|-a77g|j6481j
Bataysk|bataysk||RU|1gg|2cui|a3pk|8io9|j645e1
Batemans Bay|batemans bay||AU|176|859|-7nds|w709|j64ial
Bath|bath||GB|78|1zxy|b0h9|-i4s|j64acf
Bathurst|bathurst||AU|176|4pr|-75v8|w238|j64ic7
Bathurst|bathurst||CA|171|4pr|a7a8|-e2k4|j64l1f
Bati|bati||ET|2r|ev0|2eal|8krq|j64fx7
Batman|batman||TR|7a|6h2y|84d4|8tfs|j64akj
Batna|batna||DZ|7b|60ny|7mgk|1blw|j64l4p
Baton Rouge|baton rouge||US|zl|91o8|6j0j|-jj8q|j64laf
Batouri|batouri||CM|iw|xt9|y7l|32uq|j64hmj
Battambang|battambang|batdambang|KH|77|3bf9|2t2w|m4ao|j64m43
Batticaloa|batticaloa||LK|7c|2rpi|1njm|hieg|j64ahb
Battle Creek|battle creek||US|13e|1in8|92jv|-i991|j643c5
Batu Pahat|batu pahat||MY|rd|4a0z|ea0|m28l|j64bgx
Batumi|batumi|bat umi|GE|x|3c0m|8wzk|8x7w|j64jr5
Baturité|baturite||BR|c8|hap|-xeo|-8c00|j64gv1
Baubau|baubau||ID|1mx|iu4|-167f|qa43|j64dnn
Bauchi|bauchi||NG|7d|6rxx|27k0|23xc|j64d9l
Baures|baures||BO|ia|1va|-2ws8|-dml5|j647r7
Bauru|bauru||BR|1nj|76i8|-4sas|-aipc|j64l2p
Bávaro|bavaro||DO|wz|m3|40f6|-eo5w|j64fdd
Bawku|bawku||GH|1rv|1ksa|2dcc|-1uo|j64fef
Bay City|bay city||US|13e|1gw5|9cdl|-hzah|j643cn
Bay City|bay city||US|1ph|eef|67mb|-kkgs|j648ud
Bayamo|bayamo||CU|lv|44mw|4d8z|-gfdt|j64e7z
Bayan Obo|bayan obo||CN|16t|l78|8ya4|nkjj|j64f1b
Bayankhongor|bayankhongor||MN|7h|k98|9x94|ln6x|j64jf7
Baydhabo|baydhabo|baidoa|SO|7e|2s6n|o2o|9ct0|j64kdn
Bayghanin|bayghanin|bayganin|KZ|3s|5wp|afph|bz4k|j64g0b
Baykonur|baykonur|baikonur,leninsk|KZ|1fb|rwv|9sk2|djz1|j64jrt
Baytown|baytown||US|1ph|1udu|6dli|-kcrx|j64255
Beaufort|beaufort||US|1ll|oei|6y8y|-halr|j64917
Beaufort West|beaufort west||ZA|1up|yip|-6xm0|4u5g|j64bjd
Beaumont|beaumont||US|1ph|2e0t|6g5b|-k63d|j648u7
Beaver Falls|beaver falls||US|1cd|2kot|8qfz|-h7qy|j6434z
Béchar|bechar||DZ|ap|32mu|6rwv|-h7g|j64l3z
Beckley|beckley||US|1ul|t70|83ii|-heeu|j6496f
Bedourie|bedourie||AU|1f2|3y|-57vs|tw4q|j64iln
Beer Sheva|beer sheva|beersheba|IL|mw|4f9k|6p4k|7gr0|j646zh
Beeville|beeville||US|1ph|a18|636k|-ky90|j648up
Behbehan|behbehan|behbahan|IR|un|1u4r|6jyy|artj|j64g65
Bei'an|bei an|beian|CN|nw|3bjs|ac7q|r3xw|j64ltt
Beihai|beihai||CN|m7|fmhe|4lqs|ndtk|j64dvn
Beijing|beijing||CN|7k|6m1g0|8k3w|oy1j|j64n3f
Beipiao|beipiao||CN|yg|4wbn|8ylw|pvsg|j646kx
Beira|beira||MZ|1l0|bdf0|-48xk|7h24|j64mdz
Beirut|beirut|bayrut|LB|7l|13kds|79df|7lza|j64mlp
Béja|beja||TN|aq|19yn|7vew|1yws|j649el
Beja|beja||PT|7m|rny|85bg|-1oo6|j63vef
Béjaïa|bejaia||DZ|ar|890p|7vn8|134c|j64i0n
Bekasi|bekasi||ID|qm|1ez1f|-1bz1|mxej|j64e01
Békéscsaba|bekescsaba||HU|as|1eba|a04g|4ite|j63u75
Bekiy|bekiy|bekily|MG|1qc|3b2|-56uq|9pny|j64boz
Bélabo|belabo||CM|iw|heh|122h|2umg|j64hmn
Belagavi|belagavi|belgaum|IN|t6|d1pw|3eey|fyvu|j64kqb
Belaya Kalitva|belaya kalitva||RU|1gg|1142|abt5|8qph|j64c2l
Belebey|belebey||RU|72|1cae|blnv|blkz|j64c71
Beledweyne|beledweyne||SO|o8|1ckh|10ko|9ork|j64kfx
Belém|belem||BR|1bz|1ag2g|-b69|-ae38|j64mz5
Belen|belen||AR|c4|8rj|-5xcg|-ed8d|j64hg5
Belén|belen||PY|eq|8rj|-513b|-c9o0|j64b41
Belfast|belfast||GB|7n|9nja|bpao|-19zk|j64ldl
Belgorod|belgorod||RU|7o|7efd|aunw|7uen|j64ket
Belgrade|belgrade||RS|ll|njzs|9lu6|4dx0|j64mp3
Belgrano II Base|belgrano ii base|general belgrano ii station|AQ||2s|-gotj|-7f3r|j64ivx
Belize City|belize city|belize|BZ|7p|1cms|3r0r|-iwgs|j64hkx
Bell Ville|bell ville||AR|fn|r35|-6zjk|-dfn4|j647v5
Bella Bella|bella bella||CA|9r|12w|b6do|-rgk5|j64h01
Bella Unión|bella union||UY|4b|hj7|-6hhg|-ccg0|j648aj
Bella Vista|bella vista|bella vista norte|PY|2l|d04|-4qr4|-c440|j64b4n
Belleville|belleville||US|pl|3318|899g|-jag2|j6492h
Belleville|belleville||CA|1aa|xxy|9gsj|-gl3d|j647kd
Bellingham|bellingham||US|1u8|24we|ag8h|-q945|j648e5
Bellinzona|bellinzona||CH|1pt|csc|9wgi|1xlk|j63uj5
Bello|bello||CO|3c|b4za|1cuc|-g73o|j64jhd
Belmopan|belmopan||BZ|c6|bqs|3p48|-j0xj|j64mpx
Belo Horizonte|belo horizonte||BR|13l|3bhp4|-49nf|-9ev5|j64m0h
Belogorsk|belogorsk||RU|2t|1i63|aww7|rj8d|j64cox
Belomorsk|belomorsk||RU|t2|9dx|dtvo|7g96|j64j63
Bemidji|bemidji||US|13m|bf0|a6b4|-kc3m|j64jtb
Ben Gardane|ben gardane||TN|15f|fb7|73po|2eko|j649dz
Bend|bend||US|1ai|1m7l|9g27|-q018|j64jud
Bendigo|bendigo||AU|1t8|1r09|-7vn4|ux9s|j64m67
Benevento|benevento||IT|bg|1bof|8te1|35t8|j64drh
Bengaluru|bengaluru||IN|t6|41gvs|2s3b|gmfx|j64n1z
Bengbu|bengbu||CN|36|j5tc|729b|p5b5|j64jgx
Bengkulu|bengkulu||ID|7s|9581|-tbk|lx4c|j64km3
Benguela|benguela||AO|7u|38oq|-2p1z|2vg8|j64m4b
Benha|benha|banha|EG|1v|3kvp|6j2z|6om1|j63x8x
Beni|beni||CD|183|74vb|3s8|6b8k|j64fbn
Beni Mazar|beni mazar||EG|1t|1pdt|63u0|6lqc|j64eh1
Béni Ounif|beni ounif||DZ|5n|4cc|6val|-9nm|j64hy5
Beni Suef|beni suef||EG|6m|ahnu|68dw|6nw4|j64eh5
Benin City|benin city||NG|i6|pi7k|1cxs|17cl|j64l6v
Benito Juárez|benito juarez|juarez|AR|e4|86p|-82mn|-ctf4|j64he5
Benoni|benoni|east rand,ekurhuleni|ZA|kg|1s00g|-5lr8|62kw|j64j5f
Bensonville|bensonville||LR|14b|35l|1dn1|-29sg|j63wjt
Bentiu|bentiu||SS|1rt|5wl|1z8t|6e71|j640gx
Bento Gonçalves|bento goncalves||BR|1g0|20qn|-692n|-b1j4|j64gsj
Benton Harbor|benton harbor||US|13e|191q|90z2|-ij32|j643bt
Benxi|benxi||CN|yg|lov4|8ux7|qiuh|j64jlx
Berat|berat||AL|7y|105u|8q4c|4a3s|j63ysl
Berber|berber||SD|1g4|128k|3v0q|7a7t|j64a9z
Berbera|berbera||||56zs|28ir|9nck|j64m7d
Berbérati|berberati||CF|118|1bp3|wsk|3drc|j64kjp
Berdyansk|berdyansk|berdiansk|UA|1wb|2j9o|a0s0|7vuk|j6441j
Berekum|berekum||GH|9u|zpr|1lhk|-jzg|j64fet
Berenice|berenice|berenice troglodytica|EG|15|a|54ro|7lsq|j64eih
Berens River|berens river||CA|11m|os|b82a|-kspp|j647gt
Berezniki|berezniki||RU|1ci|3lfo|cqhk|c5yo|j64khv
Bergamo|bergamo||IT|z6|4abk|9smk|22m4|j64dtp
Bergen|bergen||NO|oj|4ksx|cxza|1531|j64mcz
Beringovskiy|beringovskiy|beringovsky|RU|dw|1fp|dim7|12fjf|j64bwl
Berkeley|berkeley||US|bb|amzo|848j|-q7g8|j641cv
Berlin|berlin||DE|80|21034|b99y|2ve4|j64n1l
Bermejo|bermejo||BO|1os|s74|-4vds|-dsj0|j64hxn
Bern|bern||CH|81|5wg1|a20f|1lm6|j64lnt
Berri|berri||AU|1lj|3n0|-7cj1|u4vk|j64ieb
Bertoua|bertoua||CM|iw|4oan|zcc|2xk0|j64hmb
Besalampy|besalampy||MG|10u|se|-3l8n|9j8h|j64boh
Besançon|besancon||FR|jn|2r3e|a4fg|1aj0|j646ub
Bestobe|bestobe||KZ|3q|5jp|b939|fo1h|j6462p
Betanzos|betanzos||BO|1dv|3qn|-46xc|-e10k|j6485t
Bethal|bethal||ZA|150|26n3|-5o8o|6b8k|j64bmx
Bethanie|bethanie|bethanien|NA|t0|7zv|-5ogz|3obw|j64djp
Bethel|bethel||US|26|4t0|d131|-yo46|j64ma7
Bethlehem|bethlehem||ZA|1ae|1sjq|-61qs|62d4|j64blt
Beyla|beyla||GN|19j|a6s|1v12|-1usq|j63yhx
Beyneu|beyneu||KZ|11g|p1g|9omy|bt5k|j64kud
Bezhetsk|bezhetsk||RU|1rd|qsw|cdpr|7v3o|j64bzx
Béziers|beziers||FR|xv|1qu6|9aht|oro|j64fo5
Bhagalpur|bhagalpur||IN|86|7qz0|5eoc|in54|j64lzf
Bhairawa|bhairawa|siddharthanagar|NP|zx|1cw7|5wg5|hve1|j63vsh
Bharatpur|bharatpur||IN|1fe|4wzs|5u9k|glzs|j64g9x
Bhatpara|bhatpara||IN|1ud|acs9|4wbc|iz0w|j64gcn
Bhavnagar|bhavnagar||IN|fo|bw82|4o1k|fgk4|j64gg1
Bhilai|bhilai|durg bhilainagar|IN|d5|nig8|4jq2|hgbu|j64mmf
Bhilwara|bhilwara||IN|1fe|8cuv|5fls|fzvy|j64g9b
Bhimphedi|bhimphedi|bhimfedi|NP|16e|bko|5wl2|i8v8|j63vuv
Bhisho|bhisho|bisho|ZA|i0|3g85|-71mk|5vcc|j64kdl
Bhiwandi|bhiwandi||IN|10w|h1fc|45bk|fo9d|j64jpb
Bhiwani|bhiwani||IN|ni|439j|66as|gbdu|j646s1
Bhopal|bhopal||IN|10h|110k8|4zev|gla8|j64mmh
Bhubaneswar|bhubaneswar|bhubaneshwar|IN|1ao|i38g|4cf8|ie8e|j64m81
Bhuj|bhuj|bhojpur|IN|fo|67bp|4zeg|eyno|j64gfx
Bhusawal|bhusawal||IN|10w|3x7d|4i6w|g93w|j646sn
Biak|biak||ID|1br|27y2|-8yn|t5r9|j64do1
Białystok|bialystok||PL|1dh|6973|be40|4ys4|j64dg3
Biarritz|biarritz||FR|3t|345g|9bfx|-c1s|j646tf
Bicheno|bicheno||AU|1oy|4x|-8z4w|vs7a|j64inj
Bida|bida||NG|17l|3q55|1y2c|1adg|j64d7v
Bidar|bidar||IN|t6|6fl4|3ual|gm4n|j64fkh
Biel|biel|biel bienne|CH|81|1oqc|a3xu|1jxw|j644p3
Bielefeld|bielefeld||DE|189|743m|b5gs|1ttg|j646fd
Biên Hòa|bien hoa||VN|1x7|dzl2|2cn8|mwb1|j64jz3
Bifoum|bifoum|bifoun|GA|14w|3q|-2kh|2848|j64flz
Big Beaver House|big beaver house||CA|1aa|a|bckc|-j9jl|j647lf
Big Delta|big delta||US|26|gf|dr05|-v9bq|j643tx
Big Spring|big spring||US|1ph|im2|6wsg|-lqzk|j6422l
Biggar|biggar||CA|1j3|1ow|b5mg|-n57d|j64gyx
Biharamulo|biharamulo||TZ|s2|q9i|-kag|6pl8|j64apb
Bijar|bijar||IR|vp|15kf|7ot1|a78h|j64g85
Bikaner|bikaner||IN|1fe|ccgf|60a8|fptf|j64g9t
Bikin|bikin||RU|ub|f63|a19n|srzt|j64crd
Bila Tserkva|bila tserkva||UA|us|49ob|ao27|6ghp|j643yz
Bilaspur|bilaspur||IN|d5|bnby|4qg8|hly8|j64gdh
Bilbao|bilbao||ES|1c8|irkw|99pw|-mlw|j64lff
Bilecik|bilecik||TR|88|v31|8lss|6fcm|j63tmp
Bilibino|bilibino||RU|dw|4fx|el2w|znfp|j64bwp
Billings|billings||US|147|28o8|9taz|-n9i0|j64l8v
Biloela|biloela||AU|1f2|4v9|-5880|w98h|j64imb
Biloxi|biloxi||US|13t|132s|6ija|-j1ud|j64izh
Biltine|biltine||TD|1u0|8hk|3451|4he7|j64knd
Bilwi|bilwi|puerto cabezas|NI|4z|x6h|30a5|-hve2|j64j3p
Binga|binga||CD|f7|1dvj|ie2|4dk8|j64ed5
Binghamton|binghamton||US|178|2zxz|90u6|-g9sf|j64977
Bingöl|bingol||TR|89|1q60|8c1e|8ohg|j63trb
Binjai|binjai||ID|1n1|c3xv|rxo|l415|j64dmb
Bintulu|bintulu||MY|1j1|38zl|ofk|o86w|j64bhv
Bir Anzarane|bir anzarane||MA|1b5|539|54ad|-3451|j64dm5
Bir Lehlou|bir lehlou||EH||dw|5ljc|-22h9|j64l5f
Bir Mogrein|bir mogrein|bir moghrein|MR|1pz|a|5ep9|-2hdl|j64krl
Birak|birak|brak|LY|4k|z1p|5wg5|327m|j64ks7
Birao|birao||CF|1sf|7uq|27cl|4vsp|j64h9h
Biratnagar|biratnagar||NP|84|3wok|5ocl|iphd|j64bg3
Birdsville|birdsville||AU|1f2|7v|-5juc|tvcy|j64ilj
Birjand|birjand||IR|1ls|6yjj|71pc|coxz|j64kul
Birmingham|birmingham||GB|1ui|1cz48|b8wx|-etv|j64ldj
Birmingham|birmingham||US|23|o6en|76pw|-ily2|j64iz7
Birnin Kebbi|birnin kebbi||NG|tv|2bgk|2o2g|wen|j64dbj
Birobidzhan|birobidzhan||RU|1vi|1mr6|agiu|shus|j64jcv
Birsk|birsk||RU|72|vna|bvno|bwl0|j64kez
Biryusinsk|biryusinsk||RU|q6|7e7|bzsn|kyqo|j64cml
Bishkek|bishkek||KG|8c|hxu0|96tq|fzhl|j64mhp
Bishop|bishop||US|bb|3q3|80aw|-pdj9|j648i3
Biskra|biskra||DZ|8d|4bxz|7gzc|187o|j64l4j
Bismarck|bismarck||US|18f|1da7|a16b|-llnd|j64m8b
Bissau|bissau||GW|8f|8n7v|2jju|-3ccw|j64mhf
Bistrița|bistrita||RO|8g|1qqu|a3pw|5956|j63uov
Bitam|bitam||GA|1uy|dlx|g2t|2glu|j64fg5
Bitlis|bitlis||TR|8h|1cgr|8890|910u|j63trp
Bitola|bitola||MK|8i|1urk|8snr|4knn|j64dcd
Biu|biu||NG|94|21b1|29y4|2m24|j64d6l
Biysk|biysk||RU|2h|4m86|b9ct|i994|j64cfp
Bizerte|bizerte||TN|8j|2zwj|7zqg|241i|j649ep
Black River|black river||JM|1h5|39h|3v4m|-gopk|j63x0f
Blackpool|blackpool||GB|xu|5uhk|bjcw|-nj8|j64adf
Blacksburg|blacksburg||US|1tg|1g38|7z9i|-h8ha|j642wp
Blagodarnyy|blagodarnyy|blagodarny|RU|1mb|rrv|9o13|9b54|j64bvx
Blagoveshchensk|blagoveshchensk||RU|2t|4qr4|aruy|rc1x|j64lkp
Blantyre|blantyre||MW|8l|cjal|-3du4|7hzf|j64lux
Blenheim|blenheim||NZ|124|ndo|-8wbj|11a8u|j64n65
Blida|blida||DZ|8n|ayk4|7t0r|lu4|j64i0t
Blitar|blitar||ID|qw|2u68|-1q9k|o1cs|j64e1t
Bloemfontein|bloemfontein||ZA|1ae|9xaw|-68ow|5me3|j64mdf
Bloemhof|bloemhof||ZA|18n|d7m|-5xcg|5hgc|j64blf
Bloomington|bloomington||US|pl|2rir|8odq|-j2og|j6491z
Bloomington|bloomington||US|pv|25ee|8e7d|-ijn4|j6492j
Bluefields|bluefields||NI|50|y8l|2klc|-hyc1|j64k9x
Blumenau|blumenau||BR|1im|6at9|-5rps|-ais4|j647cb
Bo|bo||SL|1m0|3qj6|1phw|-2il4|j64ka3
Boa Vista|boa vista||BR|1ge|51fy|lq9|-d03o|j64mof
Boaco|boaco||NI|8p|meu|2o7w|-icyg|j644zz
Bobo Dioulasso|bobo dioulasso||BF|om|7puy|2e9k|-x3o|j64m6p
Bocaiúva|bocaiuva||BR|13l|os2|-3o0o|-9e1g|j64gqx
Bocas del Toro|bocas del toro||PA|8q|7mj|2016|-hmmj|j6458x
Bodaybo|bodaybo||RU|q6|cal|cf9e|oi62|j64j9l
Bodø|bodo||NO|188|qah|ef3w|33c5|j64j35
Boende|boende||CD|1x0|orf|-1p0|4gyg|j64edf
Boffa|boffa||GN|8s|1ss|26l6|-30cu|j63yf5
Bogandé|bogande||BF|l5|7lq|2s2i|-12c|j64011
Bogor|bogor||ID|qu|joc0|-1eoh|mvo9|j64km1
Bogoroditsk|bogoroditsk||RU|1r5|uip|bixf|863c|j64c33
Bogota|bogota||CO|8r|4mkww|zhc|-fvn9|j64n3l
Bogotol|bogotol||RU|w0|i86|c1rp|j6q8|j645mf
Bogue|bogue|boghe|MR|9i|81b|3k0g|-323w|j64d45
Boise|boise||US|ph|78uv|9chi|-owtf|j64m8d
Bojnurd|bojnurd|bojnord|IR|18i|4gxy|814c|caa8|j6471n
Boké|boke||GN|8s|2hpq|2cew|-32c8|j64kv5
Bol|bol||TD|xe|2jr|2vum|35jf|j64ee1
Bol'sheretsk|bol sheretsk||RU|sf|a|b8me|xih6|j64dlt
Bolama|bolama||GW|8v|8b5|2hdi|-3bgs|j64dp7
Bolgatanga|bolgatanga||GH|1rv|1rep|2b9c|-6k4|j64feb
Boli|boli||CN|nw|21i4|9t24|rzj3|j64f3x
Bollnäs|bollnas||SE|mp|ac6|d5e8|3iaa|j649lb
Bolobo|bolobo||CD|6i|lhy|-gnv|3hb4|j64f6j
Bologna|bologna||IT|ih|agoc|9jd8|2fi0|j64dqd
Bologoye|bologoye||RU|1rd|jee|cejm|7aqu|j64c07
Bolu|bolu||TR|8x|22k5|8qbn|6rvh|j64aen
Bolzano|bolzano||IT|1qy|21zr|9yss|2fnk|j64dtz
Bom Jesus da Lapa|bom jesus da lapa||BR|5z|veb|-2u8f|-9b6o|j64gwx
Boma|boma||CD|6y|3tu6|-18zg|2sp0|j64kov
Bombo|bombo||UG|6f|1lvc|4i1|6z11|j63u0z
Bonao|bonao||DO|146|1kj9|425o|-f3a2|j63xrh
Bondo|bondo||CD|1an|i59|tec|52n0|j64ko1
Bondoukou|bondoukou||CI|1w9|18zd|1pyo|-lls|j64gkd
Bongandanga|bongandanga||CD|1x0|361|bnk|4if8|j64ecx
Bongaree|bongaree||AU|1f2|aj5|-5sxv|wtpx|j64ikb
Bongor|bongor||TD|12u|45n9|27d7|3aq8|j64ef1
Bonn|bonn||DE|189|el3z|avd1|1imo|j64ekd
Bontang|bontang||ID|sa|26gr|111|p6mw|j64jh3
Boorama|boorama|borama|||1g7k|24p8|996g|j64it7
Boosaaso|boosaaso|bosaso|SO|6u|108p|2f1c|ajh4|j64kfz
Bor|bor||SS|rh|kny|1bw8|6rif|j64kal
Boralday|boralday||KZ|2e|g78|9ad9|ggtc|j6463v
Borås|boras||SE|1tz|1e5s|cdg8|2row|j64auf
Bordeaux|bordeaux||FR|3t|h7lk|9m2w|-4lu|j64lw3
Bordertown|bordertown||AU|1lj|1zr|-7s7u|u65u|j64if1
Bordj Bou Arréridj|bordj bou arreridj||DZ|92|300w|7qdl|10rj|j63zht
Borgarnes|borgarnes||IS|1t4|1dj|du7z|-4oov|j640cd
Borisoglebsk|borisoglebsk||RU|1tr|1gxh|b0d3|90rb|j645h3
Borlänge|borlange||SE|fv|uf2|cyox|3ayf|j643v5
Borovichi|borovichi||RU|194|18nz|cilm|79jy|j64bxl
Borujerd|borujerd||IR|z9|5eeu|79q8|agjk|j6470h
Borzya|borzya||RU|dl|nh1|assu|oz2a|j64jb5
Bose|bose|baicheng|CN|m7|3r8y|54et|mumt|j64lp3
Bosobolo|bosobolo||CD|1x0|b89|wc0|49e8|j64edt
Bossangoa|bossangoa||CF|1b7|1cns|1e11|3qn8|j64h9d
Bossembélé|bossembele||CF|6l|5mf|14n2|3s6s|j64hlb
Boston|boston||US|12j|2nqrc|92mv|-f8e8|j64mtj
Botoșani|botosani||RO|96|2gkf|a8fg|5pph|j64axt
Botucatu|botucatu||BR|1nj|2fuu|-4wjg|-aduc|j64hjv
Bouaflé|bouafle||CI|11t|1b1e|1huc|-18co|j63ykh
Bouaké|bouake||CI|1sk|c5vd|1nc4|-12t8|j64m01
Bouar|bouar||CF|169|qis|19ws|3cdc|j64l1t
Bougouni|bougouni||ML|1kf|rcq|2g4c|-1lsk|j64d5v
Bouïra|bouira||DZ|99|2czk|7spp|u3c|j64i0x
Boulder|boulder||US|ei|2mci|8kxs|-mk31|j648jx
Boulder City|boulder city||US|16z|bxz|7pm6|-om1o|j648k1
Boulia|boulia||AU|1f2|go|-4wp0|tzh4|j64ilt
Boulsa|boulsa||BF|162|dht|2pnu|-4e2|j63zxz
Bourem|bourem||ML|ke|n5c|3mek|-2p8|j64ctb
Bourges|bourges||FR|ce|1jtg|a3at|iio|j64fp1
Bourke|bourke||AU|176|1wr|-6g94|va11|j64891
Bournemouth|bournemouth||GB|9d|95fl|avfo|-ens|j644cv
Boutilimit|boutilimit||MR|1qt|awu|3rf4|-35fc|j64d4b
Bowen|bowen||AU|1f2|8h3|-4abx|vrl3|j64k6z
Bowling Green|bowling green||US|u3|1iw4|7xf7|-ij04|j6492x
Bowling Green|bowling green||US|19y|sm0|8v8z|-hxgi|j642tz
Boyarka|boyarka||RU|1p3|rr4|f61i|kwbc|j64co1
Bozeman|bozeman||US|147|ynt|9sgx|-nsru|j648cd
Bozoum|bozoum||CF|1b8|v0p|1cqq|3iex|j64dpp
Bradford|bradford||GB|1um|ar44|bj4g|-di4|j644m1
Braga|braga||PT|9f|hpzl|8wn2|-1sz9|j6450d
Bragança|braganca||BR|1bz|183v|-83o|-a0vo|j64k01
Bragança|braganca||PT|9g|qiv|8ylc|-1g4e|j63vgt
Bragança Paulista|braganca paulista||BR|1nj|2qik|-4x30|-9z6k|j647zf
Brahmapur|brahmapur|berhampur|IN|1ao|6yk6|452o|i6bk|j64jp5
Brăila|braila||RO|9h|4ksh|9ph4|5zt6|j63usn
Brainerd|brainerd||US|13m|lqz|9xp8|-k6uw|j6415x
Brandfort|brandfort||ZA|1ae|9bv|-65g4|5o8s|j64bln
Brandon|brandon||CA|11m|lxe|aoil|-lf7w|j64m1h
Brasília|brasilia||BR|gu|27o1w|-3drq|-a9qk|j64mz7
Brașov|brasov||RO|9k|6o04|9s7v|5hl4|j64ayb
Bratislava|bratislava||SK|9l|92yh|abj0|3o2q|j64lg7
Bratsk|bratsk||RU|q6|5a30|c1b6|ls2e|j64mfd
Braunschweig|braunschweig|brunswick|DE|17i|58tn|b75w|290o|j646gl
Bredasdorp|bredasdorp||ZA|1up|biw|-7efj|4ajw|j64bj7
Bregenz|bregenz||AT|1tp|ks0|a6n3|23cz|j63zl7
Bremen|bremen||DE|9m|fjcd|bdkg|1vwg|j64jif
Bremerhaven|bremerhaven||DE|9m|2yaf|bh74|1u7c|j64el3
Bremerton|bremerton||US|1u8|2pus|a72w|-qab8|j648en
Brest|brest||BY|9n|6g17|b608|52vc|j64m4v
Brest|brest||FR|9o|33sz|adds|-yom|j64fnb
Breves|breves||BR|1bz|10e4|-cyo|-atl0|j64kwh
Bria|bria||CF|nq|meb|1eet|4pmh|j64kjv
Bridgeport|bridgeport|bridgeport stamford|US|er|lths|8trf|-fotv|j64l6j
Bridgetown|bridgetown||BB|1h9|43hs|2t3g|-cs05|j64m4j
Brighton|brighton||GB|9p|as4g|aw7j|-1b8|j64ain
Brikama|brikama||GM|6o|46kg|2uh0|-3kjr|j64fdv
Brindisi|brindisi||IT|3m|28l1|8pkz|3uck|j64drz
Brisbane|brisbane||AU|1f2|13v6o|-5vtv|wst7|j64mrl
Bristol|bristol||GB|9q|bv3s|b0zo|-jxl|j644ch
Bristol|bristol||US|1tg|sw3|7uhv|-hm2o|j64951
Brits|brits||ZA|18n|2mip|-5hrc|5yco|j64blb
Brive|brive|brive la gaillarde|FR|yr|16s8|9ods|btx|j64fpv
Brno|brno||CZ|vy|8blh|ajms|3k5w|j64enp
Brochet|brochet||CA|11m|7q|cemo|-lsgq|j64k1b
Brockville|brockville||CA|1aa|key|9k1x|-g82h|j647lb
Broken Hill|broken hill||AU|176|df7|-6uiz|ubaz|j64m5z
Brokopondo|brokopondo||SR|9t|6fo|12w4|-bsjc|j649a7
Brookings|brookings||US|1ln|haj|9hvg|-kqtk|j648rx
Brooks|brooks||CA|29|axf|au6f|-nzfc|j64gzj
Broome|broome||AU|1uo|a76|-3ule|q750|j64m5d
Brovary|brovary||UA|us|1wai|atm7|6li9|j643yl
Brownsville|brownsville||US|1ph|3vyv|5k00|-kwbc|j64jut
Brownsweg|brownsweg||SR|9t|3ja|12qg|-btp0|j6439j
Brownwood|brownwood||US|1ph|g70|6snr|-l7r3|j6421j
Brugge|brugge|bruges|BE|9v|350l|az7w|ox8|j64hnt
Brumado|brumado||BR|5z|wed|-31n8|-8xj0|j647ex
Brunswick|brunswick||US|kn|10bx|6ocp|-hgsl|j64jvj
Brus Laguna|brus laguna||HN|lk|34z|3dj4|-i3uo|j64a6t
Brusque|brusque||BR|1im|1w4c|-5tc4|-ahjo|j647cf
Brussels|brussels|bruxelles brussel|BE|9x|11cwo|aw8x|xf6|j64mzt
Bryan|bryan||US|1ph|356s|6kom|-knld|j641y3
Bryansk|bryansk|klintsy|RU|9y|95no|beyg|7dnw|j64li3
Bu'aale|bu aale|bu ale|SO|re|15e|8cx|94kp|j63w2b
Bua Yai|bua yai||TH|15x|e3h|3c8w|ly9m|j649xj
Bubanza|bubanza||BI|9z|9tk|-nsh|6alf|j63zpv
Bucaramanga|bucaramanga||CO|1iq|lmjs|1j14|-fo9a|j64jhh
Buchanan|buchanan||LR|lp|11a3|19nd|-25kd|j64kjl
Buchans|buchans||CA|179|j1|agoa|-c6sa|j64h7p
Bucharest|bucharest||RO|a0|15mgg|9iv5|5ldg|j64mu7
Bucheon|bucheon|puch on|KR|mm|ik7k|81cw|r68z|j64isd
Budapest|budapest||HU|a2|zziw|a6j0|438e|j64mu1
Budaun|budaun||IN|1sa|3gnn|60a4|gy9g|j6472h
Buea|buea||CM|1mq|1xig|w26|1z86|j63ymz
Buenaventura|buenaventura||CO|1sj|5f2d|tvo|-giix|j64e9l
Buenos Aires|buenos aires||AR|e4|7m8oo|-7eza|-cim3|j64n2f
Buffalo|buffalo||US|178|lry8|96vn|-gwnn|j64m9t
Bugrino|bugrino||RU|16v|8c|eqxb|akfm|j64c8j
Bugt|bugt||CN|16t|dgx|agf2|q4ue|j64f0x
Bugulma|bugulma||RU|1p0|1yws|boxz|bbd3|j645kt
Buguruslan|buguruslan||RU|1ak|15af|bi2e|b8kq|j645jl
Buizhou|buizhou|binzhou|CN|1js|2hf9|80co|panc|j64evn
Bujumbura|bujumbura||BI|a3|73xw|-q1t|6ajk|j64m6z
Bukachacha|bukachacha||RU|dl|2lo|bctl|p24u|j64lkt
Bukama|bukama||CD|tl|twy|-1z28|5jds|j64fax
Bukavu|bukavu||CD|1mp|9d0r|-jd8|66j4|j64kox
Bukhara|bukhara||UZ|a4|6uic|8iy0|dt58|j64lcp
Bukittinggi|bukittinggi||ID|1mz|av6c|-2c7|lie7|j64dmx
Bukoba|bukoba||TZ|s2|25js|-a6k|6tdc|j64apf
Bulaevo|bulaevo|bulayev|KZ|18h|7mm|brnh|f3io|j64g35
Bulandshahr|bulandshahr||IN|1sa|4990|637s|gook|j6472v
Bulawayo|bulawayo||ZW|a5|eznd|-4bms|64iw|j64mb3
Bulgan|bulgan||MN|a6|ddw|agmi|m6ut|j64jfj
Bullhead City|bullhead city||US|48|tb9|7j7e|-ok0b|j648ex
Buluko|buluko||CD|183|x4|-5ua|644g|j63xcl
Bulungu|bulungu||CD|6i|11aw|-z3s|3zio|j64f77
Bumba|bumba||CD|1x0|3fvf|gwc|4taw|j64mj1
Bunbury|bunbury||AU|1uo|kty|-75ab|osd2|j64i8x
Bundaberg|bundaberg||AU|1f2|14hk|-5byv|wnjp|j64k6v
Bungoma|bungoma||KE|1un|176i|4eg|7eo0|j64ba7
Bunia|bunia||CD|1an|22nw|c1g|6hc0|j64ejf
Buon Me Thuot|buon me thuot|buon ma thuot|VN|fs|7i0p|2pqm|n5pw|j649zd
Bur Safaga|bur safaga|safaga|EG|15|pf4|5qa1|79tx|j64eil
Bur Said|bur said|port said|EG|a8|dddk|6p7c|6x5g|j64lr3
Buraydah|buraydah|buraidah|SA|1w|8jjp|5ng0|9f7w|j64b83
Burco|burco|burao|||2a8x|21gk|9re0|j64itb
Burdur|burdur||TR|a9|1f1q|830v|6ho1|j63to1
Burgas|burgas||BG|aa|477i|941m|5vzu|j64l4t
Burgos|burgos||ES|c1|3nbb|92s0|-se8|j649dh
Burhanpur|burhanpur||IN|10h|486p|4kcs|gbf8|j64gdl
Buriram|buriram|buri ram|TH|ac|10ho|37qs|m3ni|j649xb
Burketown|burketown||AU|1f2|5k|-3sp5|twwi|j64im1
Burley|burley||US|ph|au2|947i|-oe0v|j6418z
Burlington|burlington||US|1t0|20dr|9j6e|-fowt|j64lax
Burlington|burlington||US|q1|mz1|8qvj|-jj14|j648o5
Burnie|burnie||AU|1oy|fes|-8sve|v9wf|j64k75
Burns Lake|burns lake||CA|9r|217|bmca|-qyf6|j64h1l
Burrel|burrel||AL|gj|bvx|8x6s|4ag0|j63ywh
Bursa|bursa||TR|ad|vz8g|8m77|68ah|j64ldp
Bururi|bururi||BI|ae|fqh|-uhf|6ciu|j64i67
Burwash Landing|burwash landing||CA|1vr|21|d5ds|-tsj4|j64h2d
Burylbaytal|burylbaytal|burubaytal|KZ|1wf|2s|9mqz|fv7z|j64gab
Busan|busan|pusan|KR|ag|22l6o|7it6|rnfl|j64ljz
Busia|busia||UG|ai|10cc|3i8|7axi|j63u3d
Businga|businga||CD|1x0|qfb|prw|4h18|j64edn
Busselton|busselton||AU|1uo|7vq|-77p0|oq1b|j64m57
Buta|buta||CD|1an|z8t|lrc|5aw8|j64knv
Butare|butare||RW|1m0|1new|-jzc|6dec|j64avj
Butembo|butembo||CD|183|64zn|104|69xc|j64lup
Butte|butte||US|147|qdq|9uyv|-o4be|j64ix5
Butterworth|butterworth||MY|1eg|hlzo|15sr|liow|j64bgf
Butuan|butuan||PH|r|4319|1x1z|qwp8|j64clf
Buur Gaabo|buur gaabo||SO|rf|2e0|-99l|8yxk|j64csv
Buurhakaba|buurhakaba|burhakaba|SO|7e|o4j|lh9|9g5d|j64bw3
Buy|buy||RU|vt|kfq|cj9r|8wek|j64bzf
Buyant-Uhaa|buyant uhaa|sainshand,saynshand|MN|h9|6rs|9m6y|nlx8|j64jev
Buynaksk|buynaksk||RU|fr|1mhk|96i7|a3iy|j64cjd
Buzău|buzau||RO|al|2t1m|9ofh|5qu9|j644rn
Buzmeyin|buzmeyin|abadan etrap|TM|s|vhp|85lx|ch5g|j64447
Buzuluk|buzuluk||RU|1ak|1voi|bb9p|b796|j64cch
Bydgoszcz|bydgoszcz||PL|wf|7ur8|bdvo|3uys|j64dfl
Byron Bay|byron bay||AU|176|57w|-6545|wxa9|j64ie5
Bytom|bytom||PL|1kh|e6zr|asi4|41ws|j6461t
Byumba|byumba||RW|18s|1igx|-c6s|6fy0|j64avx
Cà Mau|ca mau||VN|fm|7n6k|1yta|mjcc|j64a1p
Caacupé|caacupe||PY|ex|gqo|-5fvy|-c8w8|j640ep
Caazapá|caazapa||PY|az|48w|-5m5s|-c314|j644z3
Caballococha|caballococha||PE|za|2gr|-u7v|-f41n|j64b1h
Cabanatuan|cabanatuan||PH|199|4py2|3bm5|pxch|j64ckl
Cabimas|cabimas||VE|1r2|9gcm|28h8|-fbb8|j64277
Cabinda|cabinda||AO|b2|1ytr|-16wc|2m24|j64hsj
Cabo de Santo Agostinho|cabo de santo agostinho||BR|1cj|34tn|-1rys|-7iak|j6482j
Cabo Frio|cabo frio||BR|1g1|5ly1|-4wmc|-90ds|j647g1
Cabo San Lucas|cabo san lucas||MX|62|wvd|4wn4|-nk11|j64kh3
Caboolture|caboolture||AU|1f2|obd|-5sz2|ws64|j64ijt
Caborca|caborca|heroica caborca|MX|1la|1899|6l09|-o1gq|j64cvz
Caçador|cacador||BR|1im|1d66|-5qk4|-axo8|j647d5
Čačak|cacak||RS|14e|3n68|9enl|4cv9|j64h9l
Cáceres|caceres||BR|12q|1tsq|-3fuc|-cbr0|j6478l
Cacheu|cacheu||GW|b4|83e|2mo2|-3gqa|j63wg7
Cachoeira do Sul|cachoeira do sul||BR|1g0|1lmu|-6fpo|-bc98|j6479p
Cachoeiro de Itapemirim|cachoeiro de itapemirim||BR|iu|40az|-4gvo|-8td0|j647ff
Cacolo|cacolo||AO|zz|rc|-26bc|44m0|j64hrp
Cadillac|cadillac||US|13e|avl|9hg0|-ib20|j649bl
Cádiz|cadiz||ES|31|62hh|7twm|-1c16|j64j07
Cadiz|cadiz||PH|16s|62hh|2ck3|qfge|j64ck7
Caen|caen||FR|75|42oj|aji6|-2p8|j64fmz
Cafayate|cafayate||AR|1hk|93d|-5l99|-e502|j64hh1
Cagayan de Oro|cagayan de oro||PH|13q|o1eh|1t7g|qq2t|j64kgx
Cagliari|cagliari||IT|1j2|68xj|8en4|1y8w|j64dql
Cahul|cahul||MD|b6|1cxb|9u87|61js|j64bs7
Caibarién|caibarien||CU|1tc|u78|4tqe|-h17m|j646f3
Caicó|caico||BR|1fz|16dy|-1duc|-7y9k|j64gxt
Cairns|cairns||AU|1f2|3b01|-3mb2|v8pt|j64m6j
Cairo|cairo|al qahirah|EG|1u|72wp4|6fvr|6p40|j64n3n
Cajabamba|cajabamba||PE|b7|aem|-1msk|-gq5s|j64b0d
Cajamarca|cajamarca||PE|b7|322x|-1j64|-gtxw|j64k9b
Calabar|calabar||NG|f9|9wbo|129w|1s9w|j64d7d
Calabozo|calabozo||VE|mj|2ido|1wwo|-egdc|j6499l
Calais|calais||FR|185|1z55|ax4w|e59|j64fq7
Calais|calais||US|10z|2ju|9oi4|-eeug|j643az
Calama|calama||CL|3d|32ek|-4t84|-ersg|j64kqv
Călărași|calarasi||RO|b9|1ki0|9h3j|5uuj|j64axb
Calatrava|calatrava||GQ|yy|hg|8m4|20oa|j64ee5
Calbayog|calbayog||PH|1hp|1gep|2l40|qpga|j64kgv
Calbuco|calbuco||CL|zd|9my|-8y5u|-fod4|j646xx
Caldera|caldera||CL|4v|7wz|-5svc|-f6j0|j64frl
Caldwell|caldwell||US|ph|2u7w|9cw2|-p08h|j648dn
Calgary|calgary||CA|29|nshc|ay69|-og9f|j64mnv
Cali|cali||CO|1sj|1cb74|q8z|-geaj|j64mwh
Callao|callao||PE|yn|islp|-2l4s|-gj6e|j64j3j
Caloundra|caloundra||AU|1f2|tv6|-5qsg|wtl1|j64k6b
Calucinga|calucinga||AO|85|er|-2fcc|3h00|j64hsn
Calulo|calulo||AO|fd|m3|-255o|36yw|j64hs1
Caluula|caluula|aluula|SO|6u|e9|2kc6|avl8|j64civ
Cẩm Phả|cam pha||VN|1f0|2wj9|4ick|n034|j649wh
Cam Ranh|cam ranh||VN|uo|358z|2ju4|ner3|j64jyx
Camabatela|camabatela|ambaca|AO|fc|9wl|-1r6w|3alg|j64hrv
Camacupa|camacupa||AO|8k|fas|-2kqs|3qss|j64hst
Camagüey|camaguey||CU|bd|7g6i|4kz4|-gp7l|j64jhl
Camaná|camana||PE|44|g64|-3k8k|-fl40|j64azh
Camaquã|camaqua||BR|1g0|150x|-6lyk|-b3ro|j64gsf
Camargo|camargo||BO|dz|3mz|-4f98|-dz5w|j64hbx
Cambridge|cambridge||GB|bf|2r54|b6s4|we|j64acn
Cambridge|cambridge||NZ|1u1|bq0|-84cu|11lxr|j64n7l
Cambridge Bay|cambridge bay||CA|19e|151|etb6|-mifx|j64m1v
Cametá|cameta||BR|1bz|yvk|-ha4|-am0s|j64gol
Camiri|camiri||BO|1in|lkp|-4apg|-dm4g|j64k3l
Camocim|camocim||BR|c8|ybl|-mdk|-8r78|j647df
Camooweal|camooweal||AU|1f2|57|-49of|tlpr|j64k61
Campana|campana||AR|e4|1qz0|-7bkw|-cmxs|j647sl
Campbell River|campbell river||CA|9r|psm|apxn|-qufo|j64h07
Campeche|campeche||MX|bh|4ecc|490c|-jeaw|j64lmd
Campina Grande|campina grande||BR|1bx|8xyl|-1jsc|-7ouo|j64k15
Campinas|campinas||BR|1nj|1ntjs|-4wol|-a3fw|j64m3l
Campo Belo|campo belo||BR|13l|10n7|-4h6o|-9pds|j64gqf
Campo Grande|campo grande||BR|12r|gob4|-4ds1|-bpfu|j64mnf
Campo Maior|campo maior||BR|1d3|ohn|-116w|-91go|j647e7
Campo Murao|campo murao|campo mourao|BR|1bw|1m6h|-55kg|-b8h4|j64gtb
Campoalegre|campoalegre||CO|oz|hew|kr8|-g590|j646dd
Campobasso|campobasso||IT|141|1362|8wpa|3534|j63wmb
Campos|campos|campos dos goytacazes|BR|1g1|8axl|-4nto|-8uts|j64kyf
Camrose|camrose||CA|29|c74|bd2v|-o6hy|j647hv
Can Tho|can tho||VN|1wv|o0yw|25jo|mo4k|j64jz5
Çanakkale|canakkale||TR|1wx|1vqn|8lrn|5nr4|j64ae5
Cananea|cananea||MX|1la|psp|6n4g|-nn2w|j64cw7
Cañas|canas||CR|m4|fo2|28h8|-i8mw|j646c5
Canatlan|canatlan|ciudad canatlan|MX|hm|7za|5974|-mghk|j645s5
Canavieiras|canavieiras||BR|5z|kcn|-3cog|-8cm8|j64ky3
Canberra|canberra||AU|57|70us|-7k8u|vyoq|j64mrd
Cancún|cancun||MX|1f8|bm8r|4jck|-ilzg|j64mgf
Canela|canela||BR|1g0|1ax2|-6ajk|-aw1w|j6479d
Canelones|canelones||UY|bi|f76|-7ehw|-c2ag|j63t2f
Cangamba|cangamba|cangombe|AO|14t|10b|-2xpg|498o|j64hu5
Cangzhou|cangzhou||CN|nu|bb5t|87ok|p1rw|j64esz
Canindé|caninde||BR|c8|wyo|-xkc|-8fbg|j647e3
Çankırı|cankiri||TR|1wy|1j2r|8pbq|77f6|j63tsx
Cankuzo|cankuzo||BI|bl|52x|-ofn|6jgv|j63zo1
Canoas|canoas||BR|1g0|cuyo|-6ev4|-aywo|j6478v
Canoinhas|canoinhas||BR|1im|w0q|-5m08|-asw0|j647db
Canton|canton||US|19y|5jl0|8qt1|-hfx6|j64jw7
Cantwell|cantwell||US|26|66|dl4s|-vxb8|j643sh
Cao Bằng|cao bang||VN|bo|vq0|4uvk|mryw|j63tgl
Cao Lãnh|cao lanh||VN|1x3|37m5|28ri|mn3c|j63tf3
Cap-Chat|cap chat||CA|1fa|158|aiuw|-eaj5|j647m1
Cap-Haïtien|cap haitien||HT|181|6173|48go|-fh71|j64j23
Capanema|capanema||BR|1bz|10uu|-96k|-a41k|j6474t
Cape Coast|cape coast||GH|cb|32cn|13fk|-9n8|j64ff1
Cape Coral|cape coral||US|jl|2u89|5p9p|-hkk5|j648xt
Cape Dorset|cape dorset|kinngait|CA|19e|10u|ds8l|-gekq|j64kzn
Cape Girardeau|cape girardeau||US|pl|v6z|7zuq|-j6q5|j642mf
Cape Town|cape town||ZA|1up|1wwpk|-79pp|3y8a|j64n33
Capenda-Camulemba|capenda camulemba||AO|zy|1pq8|-20ok|3y7g|j64hrj
Capitan Arturo Prat Station|capitan arturo prat station|captain arturo prat base|AQ||15|-de8z|-csip|j64iu3
Capitan Pablo Lagerenza|capitan pablo lagerenza|mayor pablo lagerenza|PY|2i|xc|-49o9|-d109|j64b3l
Capitão Poço|capitao poco||BR|1bz|p8g|-di0|-a3ck|j64gnd
Capitol Hill|capitol hill||MP||1xg|39dd|v8ma|j64isj
Caracaraí|caracarai||BR|1ge|8rs|e0i|-d3nx|j64h2h
Caracas|caracas||VE|gt|1rz8o|291h|-eccm|j64n0l
Carahue|carahue||CL|x1|95v|-8aon|-fol0|j64fsl
Caratinga|caratinga||BR|13l|1aci|-48p8|-915k|j6476f
Carazinho|carazinho||BR|1g0|19uh|-62ac|-bbeo|j647ad
Carbondale|carbondale||US|pl|p18|833o|-j4fe|j6492f
Cardenas|cardenas||MX|1i2|btv|4pr4|-ld24|j645tx
Cardiff|cardiff||GB|bx|igns|b1dk|-ovu|j64j2d
Carhué|carhue||AR|e4|5jq|-7ywl|-dg1x|j64hdv
Carlini Base|carlini base|carlini station,formerly teniente jubany station|AQ||1o|-dc4h|-ckjt|j64iuh
Carlisle|carlisle||GB|fe|1k1l|brgg|-mlw|j644ed
Carlsbad|carlsbad||US|175|jiu|6y5q|-mc8b|j64ixt
Carmelo|carmelo||UY|eh|d21|-7a9k|-chug|j648af
Carnarvon|carnarvon||AU|1uo|5pc|-5c4m|ocxh|j64k4h
Carnarvon|carnarvon||ZA|18u|4gp|-6mt4|4qs5|j64bid
Carnot|carnot||CF|118|tdj|122h|3efe|j64dpl
Carora|carora||VE|xx|37in|26mk|-f0qo|j6427l
Carpina|carpina||BR|1cj|3jrf|-1ohs|-7k2g|j6482n
Carson City|carson city||US|16z|188t|8e6u|-po4g|j64ixp
Cartagena|cartagena||CO|8y|j0ew|289d|-g6or|j64mix
Cartagena|cartagena||ES|1fr|4bay|824k|-7k8|j64a8b
Cartago|cartago||CR|by|47yq|245o|-hzlw|j646bp
Cartago|cartago||CO|1sj|2w17|10ng|-g9q4|j646dp
Cartwright|cartwright||CA|179|e1|bid2|-c7wp|j64l1l
Caruaru|caruaru||BR|1cj|56su|-1rw0|-7pmg|j64l2z
Carúpano|carupano||VE|1mk|2pg5|2abw|-djvw|j6438t
Casa Grande|casa grande||US|48|ygf|71p6|-nybi|j641bf
Casablanca|casablanca|dar el beida|MA|lr|1w6h4|779v|-1ms7|j64n1d
Cascavel|cascavel||BR|1bw|5ifo|-5cl8|-bgi0|j64gt3
Caserta|caserta||IT|bg|5cwg|8stk|32mm|j6467t
Casey Station|casey station||AQ||5k|-e7gt|nowi|j64ivd
Casma|casma||PE|30|n5c|-20u8|-grh0|j644ub
Casper|casper||US|1uz|1awn|96re|-msb9|j64la1
Castanhal|castanhal||BR|1bz|2y0u|-9y8|-a9tw|j64gnh
Castello|castello|castello de la plana|ES|en|3vcy|8kew|-dw|j64auz
Castelo Branco|castelo branco||PT|c0|ptz|8j6m|-1ls0|j63vhd
Castillos|castillos||UY|1g9|5xi|-7bnk|-bjcs|j648b7
Castries|castries||LC||taj|301g|-d2og|j64m75
Castro|castro||BR|1bw|wh7|-5ba4|-apvo|j647bv
Castro|castro||CL|zd|n3a|-93s8|-ft5j|j646y1
Cat Lake|cat lake||CA|1aa|7p|b31u|-joc0|j64h3x
Catalão|catalao||BR|l8|1d14|-3wa0|-a9zg|j647rl
Catamarca|catamarca|san fernando del valle de catamarca|AR|c4|41os|-63oc|-e3k8|j64l2d
Catanduva|catanduva||BR|1nj|2cks|-4j48|-ahxk|j6481d
Catania|catania||IT|1ka|egha|81co|38cw|j64lob
Catanzaro|catanzaro||IT|b8|21hv|8c5o|3k34|j64dr7
Catió|catio||GW|1qf|7my|2ejr|-390z|j63wi5
Cauquenes|cauquenes||CL|12t|o76|-7pgw|-fi0w|j646yf
Caxias|caxias||BR|11v|2vw0|-11ai|-9aho|j64mn3
Caxias do Sul|caxias do sul||BR|1g0|866u|-695k|-aytw|j64m0x
Caxito|caxito||AO|7t|ls0|-1u77|2xeg|j64hrt
Cayambe|cayambe||EC|1d5|lih|e0|-gr34|j64e4b
Cazombo|cazombo||AO|14t|8a|-2jqo|4wp4|j64huh
Cebu|cebu|cebu city|PH|c9|hguw|27n7|qk05|j64mf5
Cedar City|cedar city||US|1s7|lei|82py|-o8dv|j648mx
Cedar Rapids|cedar rapids||US|q1|3nnh|8zuc|-jn94|j64juh
Ceduna|ceduna||AU|1lj|182|-6vof|sncf|j64k5n
Ceerigaabo|ceerigaabo|erigavo|||3uw0|29nt|a585|j6406h
Celaya|celaya|guanajuato|MX|m5|8829|4ees|-lls0|j645xd
Celeken|celeken|hazar|TM|68|xi|8gai|bdwa|j6443d
Central Coast|central coast||AU|176|2c2|-75vc|wffs|j6487z
Centralia|centralia||US|1u8|ekg|a0gs|-qcpm|j641a3
Ceres|ceres||BR|l8|eh3|-3a2x|-amr8|j647rh
Cerrillos|cerrillos||AR|1hk|8ve|-5c4k|-e19t|j64hh5
Cerro de Pasco|cerro de pasco||PE|1c0|2xw0|-2ahg|-gci4|j64j3d
České Budějovice|ceske budejovice||CZ|r6|249v|ahxk|33ko|j646hh
Ceuta|ceuta||ES|ci|1ope|7ox6|-14y6|j64j1x
Chabahar|chabahar||IR|1ks|1ert|5f7w|cztn|j64g8x
Chacabuco|chacabuco||AR|e4|qor|-7fd0|-cyqs|j647sn
Chachapoyas|chachapoyas||PE|2q|k1m|-1c2g|-gouk|j64b1d
Chachoengsao|chachoengsao||TH|cj|12dp|2xjq|lnwo|j63v51
Chadron|chadron||US|16q|4h2|96gn|-m2rz|j648qt
Chagda|chagda||RU|1hd|a|cvqg|sp6g|j64jbv
Chaghcharan|chaghcharan||AF|kv|bko|7ebz|dzh0|j63z5l
Chaguaramas|chaguaramas||VE|3h|bko|201c|-e781|j64993
Chainat|chainat|chai nat|TH|cn|bxp|394e|lgks|j63v0j
Chaiyaphum|chaiyaphum||TH|co|190u|3dy0|lvc2|j649xf
Chake Chake|chake chake||TZ|we|12jr|-14ff|8iv8|j64ar5
Chalatenango|chalatenango||SV|cp|ml3|30kw|-j3gc|j63wz3
Chalkida|chalkida||GR|1md|1jfm|88sg|5270|j64fv1
Challapata|challapata||BO|1ap|716|-41tw|-eba0|j64hvh
Chamdo|chamdo|changdu|CN|1v3|255s|6ohf|ku99|j64jin
Chamical|chamical||AR|x7|6xp|-6i6g|-e7pb|j64hgt
Champasak|champasak||LA|cr|a0y|36u9|movf|j63y7v
Champotón|champoton||MX|bh|kjw|45b4|-jg00|j64czj
Chañaral|chanaral||CL|4v|ag7|-5nax|-f4x3|j64kr3
Chancay|chancay||PE|yn|ksu|-2h70|-gk7w|j64b37
Chandigarh|chandigarh||IN|cs|kzeg|6l1v|ggf9|j64l7l
Chandrapur|chandrapur||IN|10w|cr72|4a38|gzvs|j64jph
Changchun|changchun||CN|r8|1w80o|9eha|qv44|j64mxt
Changde|changde||CN|p0|vhhk|680f|nxpp|j64jk3
Changhua|changhua||TW|ct|g2pc|55r2|ptvy|j64iwp
Changling|changling|changling county|CN|r8|1735|9hl8|qkpo|j646mb
Changping|changping||CN|7k|d6ed|8mdk|owk8|j64dw5
Changsha|changsha|changsha hunan|CN|p0|1jt9c|61lv|o7o0|j64mx5
Changting|changting||CN|ju|1vhe|5jla|oxi7|j64dwx
Changwon|changwon|masan|KR|mn|n6hn|7jr3|rk5o|j644kp
Changyon|changyon||KP|p5|11so|875h|qtal|j6464t
Changzhi|changzhi||CN|1ju|f4r4|7r73|o8q5|j64eqd
Changzhou|changzhou|changzhou jiangsu|CN|r3|sfx4|6t8b|ppog|j64jmj
Channel-Port aux Basques|channel port aux basques||CA|179|398|a712|-coek|j64h7l
Chanthaburi|chanthaburi||TH|cu|250r|2pbp|lvsj|j649wx
Chaoyang|chaoyang||CN|yg|a2vs|8wls|pt60|j64eun
Chaozhou|chaozhou||CN|m6|93rn|52ps|ozx8|j6469z
Chapadinha|chapadinha||BR|11w|vhg|-sur|-9akg|j64gml
Chapaev|chapaev||KZ|1uh|4mo|ara3|aymx|j64g1b
Chapayevsk|chapayevsk||RU|1hq|2aos|bcr3|anob|j645jp
Chapleau|chapleau||CA|1aa|21z|a935|-hvio|j64h31
Charagua|charagua||BO|1in|2c1|-48rw|-djt3|j64hxf
Charaña|charana||BO|x6|5h|-3rss|-ew0a|j64hup
Charata|charata||AR|ck|e49|-5u03|-d480|j64hhx
Charikar|charikar||AF|1by|15f0|7i7b|etpb|j64hq5
Charleroi|charleroi||BE|cx|7ehj|at1o|yc4|j64ho1
Charleston|charleston||US|1ll|8tus|7110|-h581|j64jvt
Charleston|charleston||US|1ul|2niv|87wp|-hhvr|j64lbl
Charleville|charleville||AU|1f2|1gs|-5npc|vch0|j64k65
Charlotte|charlotte||US|18e|lbqw|7jnp|-hbpc|j64jw3
Charlottesville|charlottesville||US|1tg|1vud|85fo|-gtj5|j64jwh
Charlottetown|charlottetown||CA|1e7|wpu|9wv1|-dj4h|j64moz
Charters Towers|charters towers||AU|1f2|7dx|-4ay1|vcjf|j64imt
Chascomús|chascomus||AR|e4|g8u|-7mfi|-cfnq|j64hej
Chattanooga|chattanooga||US|1pd|5ir9|7ilo|-i9sk|j64jwf
Chattogram|chattogram||BD|dn|2p2lk|4sbb|jobg|j64n01
Châu Đốc|chau doc||VN|2u|1i73|2akc|mj33|j64a0t
Chauk|chauk||MM|10r|1y46|4hbx|kbnq|j64irf
Cheboksary|cheboksary|ceboksary|RU|e0|9kql|c13o|a4l0|j64j7h
Chegdomyn|chegdomyn||RU|ub|bgn|ayfe|sif5|j64crl
Chegga|chegga||MR|1pz|a|5fu4|-18lk|j64d3x
Chelyabinsk|chelyabinsk||RU|d0|ndtk|btld|d61r|j64lix
Chelyuskin|chelyuskin||RU|1p3|ol|gno2|mcec|j64cob
Chemnitz|chemnitz||DE|1gy|6hir|aw7g|2row|j646hp
Chengde|chengde||CN|nu|9mp9|8s1w|p9yc|j64esv
Chengdu|chengdu||CN|1k9|2gdbs|6knz|mazt|j64n1p
Chennai|chennai||IN|1of|49j08|2t0n|h7fh|j64myv
Chenzhou|chenzhou||CN|p0|6x85|5j2s|o859|j64erh
Cheongju|cheongju|ch ungju|KR|dy|gm2g|7uqv|rbt0|j644in
Chepes|chepes||AR|x7|4n8|-6pwc|-e9w0|j647w5
Cherbourg|cherbourg|cherbourg octeville|FR|75|1b27|an3s|-cqc|j64fmv
Cheremkhovo|cheremkhovo||RU|q6|18ab|be6c|m3bn|j64j9b
Cherepanovo|cherepanovo||RU|195|fj1|bmgw|hva0|j64chh
Cherepovets|cherepovets||RU|1tm|6omi|cobw|84ik|j64c0j
Cherkasy|cherkasy||UA|d1|6dls|alfv|6vgl|j649o7
Cherkessk|cherkessk||RU|sw|2hog|9hqw|90jc|j64bvn
Cherlak|cherlak||RU|1a8|9cq|blwl|g1bc|j64cex
Chernihiv|chernihiv||UA|d2|6les|b1ex|6piv|j643wd
Chernivtsi|chernivtsi||UA|d3|6e4r|acq5|5k0g|j649nl
Chernobyl|chernobyl|chornobyl|UA|us|0|b0iu|6g8t|j64jyb
Chernogorsk|chernogorsk||RU|uc|1j8e|bjd5|jjvn|j645lj
Chernyakhovsk|chernyakhovsk||RU|sb|yv7|bpjg|4oal|j645ah
Chernyshevsky|chernyshevsky|chernyshevskiy|RU|1hd|3yp|di7k|o3u2|j64jc3
Chersky|chersky|cherskiy|RU|1hd|2uz|eqh9|yktw|j64jbl
Chester|chester||GB|d4|1x2z|behs|-mj4|j644dl
Chesterfield Inlet|chesterfield inlet||CA|19e|ae|dkpz|-jfuh|j64m1z
Chetumal|chetumal||MX|1f8|3b85|3yqw|-ixbs|j64jen
Chevery|chevery||CA|1fa|7w|atil|-crya|j64h5j
Cheyenne|cheyenne||US|1uz|1k9r|8tfs|-mgsl|j64m8t
Chiang Mai|chiang mai||TH|d6|8ihn|4128|l7qg|j64len
Chiang Rai|chiang rai|chang rai|TH|d7|2idj|49n3|le9l|j649tf
Chiayi|chiayi|chiai,chiayi city|TW|da|apsw|514z|pta7|j64iwt
Chibemba|chibemba||AO|os|15q|-3diw|30n4|j64htn
Chibia|chibia||AO|os|137|-397c|2xms|j64htt
Chicago|chicago||US|pl|5coq8|8yrz|-it3k|j64n0j
Chiclayo|chiclayo||PE|xp|cshk|-1g6l|-h40u|j64j37
Chico|chico||US|bb|21zk|8ijq|-q43g|j64jtz
Chicoutimi|chicoutimi||CA|1fa|15mc|adpp|-f8cr|j64l17
Chifeng|chifeng||CN|16t|rdc8|9268|pht4|j64ltj
Chignik|chignik||US|26|3a|c2dp|-xy8m|j649iv
Chihuahua|chihuahua|chihuahua city|MX|db|gzvs|651h|-mqkl|j64mg1
Chilca|chilca||PE|yn|9xw|-2olo|-gg4o|j64b3d
Childress|childress||US|1ph|525|7dmh|-lh97|j6423h
Chilecito|chilecito||AR|x7|fp3|-691j|-egu0|j64hgn
Chililabombwe|chililabombwe||ZM|eu|1rbo|-2ng0|5yns|j64a2z
Chillán|chillan||CL|1x8|381o|-7ueo|-fgdg|j64kr7
Chilliwack|chilliwack||CA|9r|142u|ajde|-q4z0|j647j3
Chilpancingo|chilpancingo|chilpancingo de los bravo|MX|me|3wqb|3rf0|-lbqw|j645xl
Chimaltenango|chimaltenango||GT|dc|1rk2|354s|-jgrs|j63xj7
Chimbote|chimbote||PE|30|7hxy|-1xzg|-gu90|j64lez
Chimboy|chimboy||UZ|sy|shh|979b|ct70|j649r7
Chimoio|chimoio||MZ|11i|5i94|-43j4|7698|j64kc5
Chinandega|chinandega||NI|dg|2z9r|2pgg|-ioas|j64b5b
Chincha Alta|chincha alta||PE|pf|3a44|-2vjo|-gbi0|j64b2h
Chingola|chingola||ZM|eu|3wfz|-2or8|5yw4|j64a2v
Chinhoyi|chinhoyi||ZW|12g|1bmz|-3py4|6gvc|j64a65
Chiniot|chiniot||PK|1ei|4bp1|6sr4|fn48|j6455d
Chinsali|chinsali||ZM|18s|atb|-29eg|6vdk|j64a2d
Chipata|chipata||ZM|hz|1ubv|-2x60|6zuo|j64a3d
Chiquimula|chiquimula||GT|dh|w1d|366a|-j6xc|j63xm3
Chiquinquirá|chiquinquira||CO|9e|15nb|17d8|-ftlj|j64e55
Chiradzulu|chiradzulu||MW|di|17w|-3d54|7jh5|j63xfl
Chirala|chirala||IN|33|5f7s|3edo|h7wo|j64fip
Chiramba|chiramba||MZ|1l0|fg|-3mc9|7fen|j64bsz
Chirchiq|chirchiq||UZ|1ox|3lia|8vva|ewq8|j64481
Chiredzi|chiredzi||ZW|12k|lrh|-4if4|6sag|j64a5p
Chiromo|chiromo||MW|196|jgz|-3jp8|7j38|j64kpd
Chișinău|chisinau||MD|dk|eqyu|a2oy|66o1|j64mdx
Chistopol|chistopol|cistay|RU|1p0|1bzs|bv74|auqv|j64cdp
Chita|chita||RU|dl|6m1g|b5nq|obi2|j64mfl
Chitipa|chitipa||MW|dm|ack|-22yy|74oq|j64bsh
Chitré|chitre||PA|o1|y0i|1phw|-h8iw|j64581
Chitungwiza|chitungwiza||ZW|ne|7amg|-3uw0|6nyw|j64ldf
Chivilcoy|chivilcoy||AR|e4|162a|-7hag|-cv9s|j647t1
Chlef|chlef||DZ|do|9mkv|7r3c|a6o|j64i01
Choele Choel|choele choel||AR|1fc|7ps|-8eze|-e2td|j647un
Choibalsan|choibalsan|choybalsan|MN|h8|pr4|aavu|ojj8|j64lnd
Chokurdakh|chokurdakh||RU|1hd|1xm|f4w7|vp5u|j64ll1
Cholpon Ata|cholpon ata||KG|1vp|ecj|953l|girf|j64565
Choluteca|choluteca||HN|dr|24px|2umn|-ioro|j64a7b
Choma|choma||ZM|1m0|102i|-3lpb|5s3o|j64a3v
Chon Buri|chon buri||TH|ds|4uuy|2vec|lnbk|j649wt
Chonchi|chonchi||CL|zd|al|-94s4|-ftir|j646y5
Chone|chone||EC|11a|yj3|-5bk|-h5z8|j64e3t
Chongjin|chongjin|ch ongjin|KP|nb|eezq|8yeu|rtgs|j64jez
Chongju|chongju||KP|1be|31e1|8i6l|qu6b|j64dj7
Chongqing|chongqing||CN|dt|3uhc8|6c51|muh6|j64mvz
Chos Malal|chos malal||AR|16x|6lo|-80g6|-f26i|j64hbd
Chosan|chosan||KP|cl|60a|8r0f|qyoo|j6465j
Chosica|chosica||PE|yn|1wda|-2k1w|-gfwc|j644vl
Chota|chota||PE|b7|azk|-1ejc|-guv8|j64b0l
Christchurch|christchurch||NZ|bn|7s8w|-9bx2|1100s|j64n6d
Christiansted|christiansted||VI||p3z|3syo|-dvm4|j64isl
Chukai|chukai||MY|1qx|1rll|wnw|m67j|j64bhf
Chulucanas|chulucanas||PE|1da|1h43|-139s|-h6lg|j64az1
Chumbicha|chumbicha||AR|c4|1zg|-66qi|-e725|j647vj
Chumikan|chumikan||RU|ub|109|bq5m|t03d|j64jd1
Chumphon|chumphon||TH|dx|1u46|2947|l9c0|j649sx
Chuncheon|chuncheon|ch unch on|KR|kb|4urx|848r|rdlq|j644jb
Chuquicamata|chuquicamata||CL|3d|0|-4s80|-erv8|j646up
Chur|chur||CH|lw|tjp|a1hw|21aw|j643k1
Churchill|churchill||CA|11m|rs|clfw|-k6l8|j64mnn
Churchill Falls|churchill falls||CA|179|2s|bh0g|-dpof|j64h7z
Chusovoy|chusovoy||RU|1ci|1jn5|chsm|ce37|j64dgx
Chuxiong|chuxiong|chuxiong city|CN|1vt|5g9u|5d6k|lrj4|j646kf
Ciego de Ávila|ciego de avila||CU|e1|31l7|4oio|-gvqb|j646cp
Ciénaga|cienaga||CO|10q|2t7n|2cyg|-fwx0|j64eal
Cienfuegos|cienfuegos||CU|e2|400k|4qv8|-h8oj|j64e5z
Cilacap|cilacap||ID|qv|p6lw|-1nk4|nd62|j64dz3
Cincinnati|cincinnati||US|19y|z2cg|8e6u|-i3ot|j64m9h
Circle|circle||US|26|2s|e3wz|-uvkt|j649kj
Cirebon|cirebon||ID|qu|5g7u|-1fyd|n9pe|j64klx
Ciudad Altamirano|ciudad altamirano||MX|me|ixh|3xd0|-lkmc|j64d1f
Ciudad Bolívar|ciudad bolivar||VE|8y|78sw|1qi0|-dmqo|j64jwx
Ciudad Camargo|ciudad camargo|santa rosalia de camargo|MX|db|t4f|5xns|-mjhx|j64cuh
Ciudad Constitución|ciudad constitucion||MX|62|usr|5d7k|-nxko|j645r3
Ciudad Cortés|ciudad cortes||CR|1ej|2yy|1x50|-hwis|j64e6l
Ciudad del Carmen|ciudad del carmen||MX|bh|3cir|3zxl|-joit|j64czf
Ciudad del Este|ciudad del este||PY|2j|6vl4|-5gvz|-bpf5|j64lf7
Ciudad Guayana|ciudad guayana||VE|8y|g013|1sl0|-df6g|j64m9x
Ciudad Guzman|ciudad guzman||MX|qp|1z41|4834|-m6aw|j64cy5
Ciudad Hidalgo|ciudad hidalgo||MX|13f|1di2|47uo|-lk04|j645v5
Ciudad Juárez|ciudad juarez||MX|db|ss9k|6sjf|-mtp4|j64jdx
Ciudad Madero|ciudad madero||MX|1oc|44ps|4s7p|-kywp|j645ux
Ciudad Mante|ciudad mante||MX|1oc|1ppp|4veu|-l7i4|j645uj
Ciudad Obregon|ciudad obregon||MX|1la|6682|5vxm|-nk6q|j64cvp
Ciudad Valles|ciudad valles||MX|1i2|2gpg|4plk|-l81k|j645u3
Ciudad Victoria|ciudad victoria||MX|1oc|5w44|530w|-l8w4|j64je5
Civitavecchia|civitavecchia||IT|y3|1bb8|90uk|2j1s|j64dsv
Clare|clare||AU|1lj|2d1|-7921|tpg0|j64ien
Clarksburg|clarksburg||US|1ul|m79|8f41|-h7vt|j6431j
Clarksville|clarksville||US|1pd|2u9k|7tv9|-iq2i|j64945
Cleburne|cleburne||US|1ph|rfd|6xmj|-kvhh|j64213
Clermont-Ferrand|clermont ferrand||FR|59|4ztm|9t8o|nrk|j646tx
Cleveland|cleveland||US|19y|14ic0|8vzz|-hidl|j64m9f
Cliza|cliza||BO|eb|c7c|-3rq4|-e4pw|j647qh
Cloncurry|cloncurry||AU|1f2|xe|-4fq0|u43s|j64k6p
Clovis|clovis||US|175|q2o|7dgz|-m4c0|j648kf
Cluj-Napoca|cluj napoca||RO|e8|6sek|a10s|5234|j64k8h
Coalcoman|coalcoman|coalcoman de vazquez pallares|MX|13f|89n|40ws|-m3ws|j64cyn
Coari|coari||BR|2q|154p|-vhc|-dj44|j64kvx
Coatzacoalcos|coatzacoalcos||MX|1sy|65o5|3vtg|-k8js|j64d25
Cobalt|cobalt||CA|1aa|124|a5m5|-h2u9|j64h4n
Cobán|coban||GT|2g|1eay|3bd8|-jddk|j646qd
Cobram|cobram||AU|1t8|3lf|-7p5o|v7uc|j64iin
Coburg|coburg||DE|7i|1b3y|aruy|2cma|j646h3
Cochabamba|cochabamba||BO|eb|lfls|-3qc4|-e6kk|j64k2p
Cochrane|cochrane||CA|1aa|3fd|ailq|-hd4m|j64h4t
Cochrane|cochrane||CL|v|3fd|-a4pj|-fjsr|j64fqv
Codó|codo||BR|11w|1s9k|-ykc|-9ekw|j64gmd
Cody|cody||US|1uz|72h|9jjk|-ndhn|j64juf
Coeur d'Alene|coeur d alene||US|ph|qmq|a7vx|-p12q|j648dx
Coffeyville|coffeyville||US|sr|92o|7xsd|-khuv|j648pf
Coffs Harbour|coffs harbour||AU|176|1cle|-6hun|wtf7|j64idb
Coihaique|coihaique|coyhaique|CL|w|zbv|-9rmc|-fg3g|j64lwd
Coimbatore|coimbatore||IN|1of|10cn4|2cw3|ghqh|j64mml
Coimbra|coimbra||PT|ed|2a8m|8m6s|-1sxz|j64b63
Cojutepeque|cojutepeque||SV|fh|11cr|2xu7|-j27p|j63wvx
Colac|colac||AU|1t8|70h|-87tv|urvc|j64igx
Cold Bay|cold bay||US|26|5k|btxc|-yvin|j64ma5
Colesberg|colesberg||ZA|18u|9l3|-6l17|5do8|j64bi3
Colíder|colider||BR|12q|kxv|-2bgt|-bvuy|j64m0n
Colima|colima||MX|ef|4saf|44do|-m8b4|j64lmb
Colinas|colinas||BR|11w|jeu|-1aln|-9hcw|j64gn3
Collipulli|collipulli||CL|x1|cnc|-84wg|-fivg|j646wj
Cologne|cologne|koln|DE|189|liow|awzs|1hm1|j64ko3
Colombo|colombo||LK|eg|4nfs|1hhk|h46q|j64mf3
Colón|colon|bucaramanga|PA|ej|4deo|209e|-h4bi|j64j5j
Colón|colon||CU|12o|1dai|4vb0|-hc9u|j64ec7
Colonia del Sacramento|colonia del sacramento||UY|eh|gr6|-7e1s|-ceao|j63t11
Colorado Springs|colorado springs||US|ei|akwm|8bva|-mgkw|j64l9p
Columbia|columbia||US|13u|8j65|8ck1|-jsgb|j648px
Columbia|columbia||US|1ll|8j65|7ank|-hc88|j64lbb
Columbia|columbia||US|1pd|2hkr|7mt2|-inkh|j642vt
Columbus|columbus|columbus ohio|US|19y|r7xs|8ki3|-hsdc|j64jwd
Columbus|columbus||US|kn|4o70|6yjk|-i7pk|j648zj
Comallo|comallo||AR|1fc|kl|-8sm5|-f26i|j647ub
Comandante Fontana|comandante fontana||AR|jm|3at|-5fh1|-csip|j647xf
Comayagua|comayagua||HN|ek|1iw6|33ks|-isb8|j64a75
Combarbalá|combarbala||CL|ew|3ym|-6ol4|-f7u8|j646v3
Comilla|comilla|cumilla|BD|dn|8cgz|513k|jjh0|j64i4n
Como|como||IT|z6|5cwg|9th0|1y28|j6468z
Comodoro Rivadavia|comodoro rivadavia||AR|dv|30oi|-9txo|-egu0|j64mpf
Comondante Luis Piedrabuena|comondante luis piedrabuena|comandante luis piedrabuena|AR|1in|be|-aplt|-ernv|j647p3
Compostela|compostela||MX|16m|cgy|4jtc|-mhew|j64cz5
Conakry|conakry||GN|ep|w0s0|21k7|-2xkm|j64mmt
Conceição do Araguaia|conceicao do araguaia||BR|1bz|kx7|-1rno|-akbo|j64kwp
Concepción|concepcion||CL|aw|j2il|-7w6k|-fnno|j64ml3
Concepción|concepcion||PY|eq|19m6|-50ls|-cb60|j64j3l
Concepción del Uruguay|concepcion del uruguay||AR|ij|1gdz|-6ym8|-chds|j647xx
Concord|concord||US|172|yf2|99e9|-fbzo|j64jv1
Concordia|concordia||AR|ij|341m|-6q7c|-cfrg|j64hid
Concórdia|concordia||BR|1im|16pz|-5u3w|-b5gs|j647c5
Concordia Research Station|concordia research station|concordia station|AQ||u|-g04n|qm2u|j64ivb
Conroe|conroe||US|1ph|w4r|6hw1|-kgjj|j648sn
Conselheiro Lafaiete|conselheiro lafaiete||BR|13l|2e3w|-4fho|-9dvw|j6477l
Constanța|constanta||RO|es|6i3r|9h2j|64r8|j64led
Constantine|constantine||DZ|et|cyyj|7sk0|1exb|j64m4t
Constitución|constitucion||CL|12t|t99|-7kls|-fiso|j64ft7
Contamana|contamana||PE|za|ell|-1kmw|-g2uw|j64k9l
Conway|conway||US|49|1bu3|7irl|-jtcx|j648nv
Cooma|cooma||AU|176|514|-7rmk|vym8|j64iap
Coos Bay|coos bay||US|1ai|oo8|9ama|-qmgm|j64jub
Copiapó|copiapo||CL|4v|2rr4|-5v40|-f2qw|j64lwh
Coquimbo|coquimbo|atletico morelia|CL|ew|3gh1|-6f49|-faho|j64frp
Coracora|coracora||PE|5b|5q4|-37w4|-ftd8|j64b2d
Coral Gables|coral gables||US|jl|37qo|5if6|-h7j3|j648xn
Coral Harbour|coral harbour||CA|19e|n6|dr0i|-htsm|j64h1v
Coral Springs|coral springs||US|jl|5cwg|5mpg|-h7dg|j642ej
Córdoba|cordoba||AR|fn|v4dc|-6q9o|-dr8y|j64mpt
Córdoba|cordoba||ES|31|6vz4|84a8|-10t0|j64le5
Córdoba|cordoba||MX|1sy|4q6r|41zo|-kru8|j64d2f
Cordova|cordova||US|26|1qp|cz5g|-v8o7|j64jy1
Cork|cork||IE|ey|41rf|b4ga|-1tjy|j64jg5
Corner Brook|corner brook||CA|179|g1j|ahp8|-cf0l|j64k2d
Cornwall|cornwall||CA|1aa|11o5|9ncr|-g0n9|j64h41
Coro|coro||VE|j5|46mz|2g48|-exnk|j64jux
Coro Coro|coro coro|corocoro|BO|x6|1gc|-3ohc|-eo5w|j64hv7
Coroatá|coroata||BR|11w|qc1|-vv4|-9gnw|j64gmh
Coroico|coroico||BO|x6|1tl|-3gx4|-eij4|j64hv3
Coronel|coronel||CL|aw|1zpo|-7xq3|-foi8|j646wx
Coronel Bogado|coronel bogado||PY|qe|b15|-5tn8|-c210|j644zn
Coronel Oviedo|coronel oviedo||PY|ay|1vz9|-5gdg|-c3hs|j644yx
Coronel Suárez|coronel suarez||AR|e4|ku0|-813e|-d9r2|j647tt
Çorovodë|corovode||AL|7y|au6|8omn|4c4d|j63yt3
Corozal|corozal|corozal town|BZ|f1|6qc|3xyk|-iy08|j640t1
Corpus Christi|corpus christi||US|1ph|5y32|5y2c|-kvk3|j64laj
Corrientes|corrientes||AR|f2|7azb|-5w44|-cls4|j647xt
Corriverton|corriverton||GY|10t|99c|19iw|-c94k|j64493
Corum|corum||TR|1wz|3xiy|8onk|7hoc|j644hf
Corumbá|corumba||BR|12r|22h4|-42q8|-cctw|j64m0f
Corvallis|corvallis||US|1ai|19jq|9jx8|-qf8g|j648lt
Cotabato|cotabato|cotabato city|PH|1jv|5zof|1jop|qmpg|j64kgt
Cotonou|cotonou||BJ|1ba|gbyo|1dec|jfg|j64mqt
Cottbus|cottbus||DE|9j|292j|b3go|32kk|j64enz
Cottica|cottica||SR|1kp|mje|tpg|-bmgt|j64le3
Cotuí|cotui||DO|1ni|w4p|4326|-f1ao|j63x5d
Council Bluffs|council bluffs||US|q1|26jx|8udr|-kjo0|j648on
Courtenay|courtenay||CA|9r|pax|ancx|-qsi8|j64k1l
Coventry|coventry||GB|1ui|8blb|b8h8|-bko|j64acb
Covilhã|covilha||PT|c0|j5o|8mtt|-1lvc|j6450l
Covington|covington||US|u3|cjrl|8dko|-i42m|j6492v
Cowell|cowell||AU|1lj|ex|-77wd|tcge|j64ifn
Cowra|cowra||AU|176|58r|-7914|vv80|j64ib7
Cozumel|cozumel|san miguel de cozumel|MX|1f8|1l1q|4e98|-imws|j64khb
Cradock|cradock||ZA|i0|pdu|-6wgb|5hlw|j64bu5
Craig|craig||US|ei|78v|8omt|-n1v4|j648jt
Craiova|craiova||RO|h4|6ioe|9i0v|53ub|j64ax5
Cranbourne|cranbourne||AU|1t8|9vbf|-85z8|v50i|j64ii1
Cranbrook|cranbrook||CA|9r|ecy|am2n|-ot9f|j647iv
Crateús|crateus||BR|c8|14ud|-13uw|-8ps4|j64gux
Crato|crato||BR|c8|5vbv|-1js8|-8g60|j64gub
Crato|crato||BR|2q|5vbv|-1llb|-dif4|j64kwb
Crescent City|crescent city||US|bb|8we|8y71|-qmc5|j648ip
Creston|creston||CA|9r|3ps|aiuw|-oz1r|j647ip
Crestview|crestview||US|jl|hab|6lau|-ijzy|j642hd
Criciúma|criciuma||BR|1im|4dkp|-65ao|-al3g|j64kxl
Cristalina|cristalina||BR|l8|s6r|-3lec|-a7d0|j647rp
Crookston|crookston||US|13m|6od|a8mi|-kpfh|j6416d
Crotone|crotone||IT|b8|1aay|8dkh|3o4h|j6467f
Cruzeiro do Sul|cruzeiro do sul||BR|9|17vi|-1mvg|-fkq4|j64mmx
Cuamba|cuamba||MZ|16h|1kj8|-3648|7ty0|j64bl1
Cuangar|cuangar||NA|to|dw|-3rvj|3zo8|j64dkz
Cuauhtémoc|cuauhtemoc||MX|db|1y37|63c1|-mwm0|j64cu5
Cubal|cubal||AO|7u|3qd|-2sm4|31vk|j64hsx
Cúcuta|cucuta||CO|18c|fh7m|1p40|-fjkg|j64ji1
Cuddalore|cuddalore||IN|1of|3ecp|2ifo|h3ic|j64geh
Cuenca|cuenca||EC|5h|65cu|-mdk|-gxkg|j64lqd
Cuencame|cuencame||MX|hm|6uk|5bwg|-m85k|j64cul
Cuernavaca|cuernavaca||MX|14j|hvip|41zv|-l9qo|j64jeh
Cuevo|cuevo||BO|1in|qh|-4dsk|-dm78|j64867
Cuiabá|cuiaba||BR|12q|h9ww|-3c4d|-c0rp|j64m0t
Cuilapa|cuilapa||GT|1ip|cpw|326e|-jcqs|j63xlp
Cuito Caunavale|cuito caunavale|cuito cuanavale|AO|fb|45|-38z0|43x0|j64ht5
Culiacán|culiacan||MX|1kj|hc88|5blr|-n0kb|j64llv
Cumaná|cumana||VE|1mk|6t2b|28ms|-dr7s|j64j03
Cumberland|cumberland||US|129|gg4|8hys|-gvqk|j6496p
Curanilahue|curanilahue||CL|aw|nmb|-8174|-fpw8|j646xb
Curepipe|curepipe||MU||6fgn|-4cre|cbsu|j64itn
Curicó|curico||CL|12t|2fqn|-7hwo|-f9ow|j64krj
Curitiba|curitiba||BR|1bw|1u3mo|-5g4l|-akkj|j64mzd
Curvelo|curvelo||BR|13l|1dci|-40r0|-9ito|j64gqn
Cusco|cusco|cuzco|PE|fi|7qou|-2wcy|-ffca|j64mc3
Cutral Có|cutral co||AR|16y|10w6|-8cgo|-eu9c|j647q7
Cuttack|cuttack|pochinki|IN|1ao|cfj4|4dy4|ieqb|j64lvf
Cuya|cuya||CL|1op|k|-43i7|-f15h|j646ul
Da Lat|da lat||VN|104|5hjn|2k20|n8ko|j649zj
Da Nang|da nang||VN|1x5|lfls|3fx4|n79g|j64ld3
Daan|daan|da an|CN|r8|1zzl|9r2w|qn3s|j646m5
Dabola|dabola||GN|j7|a2p|2axk|-2dpu|j63yjh
Dabou|dabou||CI|xl|1k9d|151w|-xvf|j64gkv
Daegu|daegu|taegu|KR|1nz|1gq5c|7orj|rkbm|j64j8n
Daejeon|daejeon|daejon,taejon|KR|fq|vgps|7sdr|rb7b|j64ljv
Dagupan|dagupan||PH|1bp|3iak|3ftr|psk0|j64ckp
Dakar|dakar||SN|ft|1jt9c|35ka|-3qu7|j64n15
Dalaba|dalaba||GN|119|4wd|2a80|-2mow|j63yep
Dalandzadgad|dalandzadgad|dalanzadgad|MN|1x9|bn9|9cak|mdv7|j64ln3
Dalby|dalby||AU|1f2|7lj|-5ttv|wf69|j64ik5
Dalhart|dalhart||US|1ph|5gw|7q8w|-lz1e|j64241
Dali|dali||CN|1vt|3cwd|5iaw|lgzs|j64jkt
Dali|dali||CN|1jm|2cn4|7ghd|nkaa|j646j5
Dalian|dalian||CN|yg|1vvo8|8ccg|q2hj|j64lsp
Dallas|dallas|dallas fort worth|US|1ph|2uu5s|7198|-kr8k|j64mtf
Dalnegorsk|dalnegorsk||RU|1e5|69n|9jng|t1no|j64lkv
Dalnerechensk|dalnerechensk||RU|1e5|lu4|9udl|snt3|j645oz
Daloa|daloa||CI|np|5gw0|1h5w|-1dro|j64kvb
Dalton|dalton||US|kn|196l|7ga9|-i7mv|j642i5
Daman|daman||IN|fo|unt|4dje|fm44|j64gfl
Damanhûr|damanhur||EG|18|apsw|6nl4|6j3w|j64egn
Damascus|damascus|dimashq|SY|fw|1gus0|76i4|7s2t|j64mud
Damaturu|damaturu||NG|1vk|5hg7|2inm|2kbw|j640ix
Dammam|dammam|ad dammam,ad damman|SA|4j|181fa|5nxp|aqk1|j64bd1
Dandeldhura|dandeldhura|dadeldhura|NP|10v|eo6|6a2w|h9ww|j63vsx
Dandong|dandong||CN|yg|inao|8lrk|qnt8|j64jln
Dangriga|dangriga|stann creek town|BZ|1m9|8am|3mxw|-iwpk|j6482x
Danjiangkou|danjiangkou||CN|ox|1yzs|6yxc|nwc8|j646jj
Danville|danville||US|1tg|zeu|7uav|-h0m9|j6494t
Daqing|daqing||CN|nw|10abs|9zff|qshp|j64ltv
Dar'a|dar a|daraa|SY|fy|350x|6zqi|7ql6|j63uet
Dar es Salaam|dar es salaam||TZ|fx|1qssw|-1ggd|8ezc|j64mvd
Darkhan|darkhan|darhan|MN|1jd|1lo2|amuf|mslo|j64jfn
Darnah|darnah|derna|LY|1x|2qqu|70tc|4uon|j64ksl
Darregueira|darregueira||AR|e4|2ms|-82w4|-djea|j64hdz
Daru|daru||PG||bqm|-1yac|up75|j6407f
Darwin|darwin||AU|18x|1ztk|-2nvi|s1n8|j64mr7
Daşoguz|dasoguz|dashkhovuz|TM|1ow|4bf4|8yu8|cuoy|j64jyl
Datong|datong|datong shanxi|CN|1ju|1457s|8l9w|oa7p|j64jjj
Daugavpils|daugavpils||LV|g0|2e30|bz68|5ojw|j64kk3
Dauphin|dauphin||CA|11m|705|ayoc|-lfzn|j64kyp
Davangere|davangere||IN|t6|asjw|33ng|g9sw|j64kq5
Davao|davao|davao city|PH|g1|u1sg|1ivk|qxcp|j64mfb
Davenport|davenport||US|q1|5hbu|8wms|-jez7|j648o1
David|david||PA|dj|2cwl|1t2l|-ho25|j64lhd
Davis Station|davis station||AQ||1y|-eqox|gqxr|j64iv7
Dawei|dawei|tavoy|MM|1oj|34tg|30s4|l1oe|j64irt
Dawmat al Jandal|dawmat al jandal||SA|1k|hfb|6e21|8jm0|j6450z
Dawra|dawra|daora,daoura|MA|xc|a|5vwl|-2s8y|j64dlb
Dawson City|dawson city|dawson|CA|1vr|10n|dqca|-tvqv|j64m27
Dawson Creek|dawson creek||CA|9r|8c2|byau|-prq5|j64h0v
Dayr az Zawr|dayr az zawr|deir ez zor|SY|g3|6mj9|7km0|8ln8|j649gb
Dayton|dayton||US|19y|gkg8|8iqb|-i1pf|j64izp
Daytona Beach|daytona beach||US|jl|4ncq|69e2|-hd6f|j64jvd
De Aar|de aar||ZA|18u|oxq|-6khw|556o|j64kbp
De-Kastri|de kastri||RU|ub|2sf|b14a|u6ah|j64jcz
Dease Lake|dease lake||CA|9r|8f|cj07|-rvcd|j64h1p
Debre Birhan|debre birhan|debre berhan|ET|2r|1ebz|22p0|8h0k|j64fx3
Debre Markos|debre markos|debre marqos|ET|2r|1ili|27s8|831s|j64ksx
Debrecen|debrecen||HU|n4|4ygm|a6qx|4mwc|j64anj
Decatur|decatur||US|pl|1o30|8jev|-j2dn|j6491h
Dédougou|dedougou||BF|14r|yzh|2o3q|-qq8|j63zt5
Dedza|dedza||MW|g6|c1k|-32ur|7cx1|j63xe7
Deer Lake|deer lake||CA|179|37n|ajfk|-cb3x|j647nz
Deer Lake|deer lake||CA|1aa|2vz|b9zu|-k5tm|j64h3t
Dehibat|dehibat|dehiba|TN|1oz|2px|6v1n|2ak8|j649e7
Dehra Dun|dehra dun|dehradun|IN|1sc|fb3j|6hyc|gq8k|j64gc5
Del Rio|del rio||US|1ph|rtw|6akd|-lmis|j648tv
Delano|delano||US|bb|yj9|7nxv|-pk33|j641f3
Delémont|delemont||CH|rj|8qb|a5ic|1koa|j63ufd
Delhi|delhi||IN|g8|9hckw|658f|gjw9|j64my5
Delicias|delicias||MX|db|2gkf|61lc|-mm1k|j64jdz
Demba|demba||CD|ta|h6f|-16ig|4rrc|j64f87
Dembi Dolo|dembi dolo|dembi dollo|ET|g|lfo|1tuh|7gio|j64fyl
Deming|deming||US|175|ckq|6wxf|-n3g6|j641i5
Denali Park|denali park||US|26|1eq|dnrn|-vx11|j649kn
Dengzhou|dengzhou||CN|nx|19sa|705w|o0tc|j64euf
Deniliquin|deniliquin||AU|176|66w|-7m5c|v2fw|j64ia7
Denizli|denizli||TR|gb|7zaw|83fs|68ds|j64aex
Denow|denow|denov|UZ|1n7|4nne|87ck|ejtk|j64465
Denpasar|denpasar||ID|66|fp2w|-1uqs|op1k|j64jh5
Denton|denton||US|1ph|3siq|74am|-ktg8|j648v7
Denver|denver|denver aurora|US|ei|1dkq0|8in7|-mi2s|j64n0b
Dera Ghazi Khan|dera ghazi khan||PK|1ei|5265|6fy4|f50v|j64bed
Dera Ismail Khan|dera ismail khan||PK|15m|26eo|6tle|f722|j64bfp
Derbent|derbent||RU|fr|29rh|90iq|acie|j64cj7
Derby|derby||AU|1uo|2gv|-3phk|qkj6|j64k4b
Derzhavinsk|derzhavinsk||KZ|3q|c88|ayb1|e7mr|j64g1t
Des Moines|des moines||US|q1|85pr|8wu0|-k2dk|j64m8v
Desaguadero|desaguadero||PE|bc|441|-3jta|-esr6|j64b03
Dese|dese|dessie|ET|2r|3xtm|2dvo|8hsc|j64ksz
Detroit|detroit||US|13e|2fwco|92mv|-ht2c|j64mtp
Deva|deva||RO|p1|1gbe|9u1d|4wtr|j63upd
Devils Lake|devils lake||US|18f|611|ab8i|-l6t1|j6418l
Devonport|devonport||AU|1oy|ewl|-8tuf|vd3j|j64m6n
Deyang|deyang||CN|1k9|39fm|6o85|mdk0|j646k1
Dezful|dezful||IR|un|6rfe|6xuk|adzw|j64g6b
Dezhou|dezhou||CN|1js|84v7|80yw|oxdk|j64ew1
Dhaka|dhaka||BD|ge|7maj6|532a|jdky|j64mzv
Dhamar|dhamar||YE|gf|43kr|34br|9ihv|j643jb
Dhanbad|dhanbad||IN|r2|qpf4|53nr|iit0|j64l8f
Dhangarhi|dhangarhi|dhangadhi|NP|8|1z7q|65eu|h9uy|j63vtn
Dhule|dhule||IN|10w|a9nl|4h9k|g0xg|j64jpl
Dhuusa Mareeb|dhuusa mareeb|dusmareb|SO|k6|cf|18b0|9yuw|j63w2t
Diamantina|diamantina||BR|13l|stb|-3wqo|-9chw|j6476j
Diapaga|diapaga||BF|1ol|k2l|2l6q|duw|j6402j
Dibaya|dibaya||CD|t9|gr|-1e87|4wgs|j64f7v
Dibrugarh|dibrugarh||IN|4n|3kda|5w29|kc94|j64jpn
Dickinson|dickinson||US|18f|cnj|a1rc|-m14g|j648cl
Diébougou|diebougou||BF|98|9to|2ci8|-p28|j6400b
Diego de Almagro|diego de almagro||CL|4v|dzt|-5ngw|-f0ic|j64frh
Diekirch|diekirch||LU|gk|4te|aowh|1bkz|j63wov
Dieppe|dieppe||FR|nr|wrh|apah|8cx|j64fph
Diffa|diffa||NE|gl|nws|2ur7|2pah|j64b7p
Digby|digby||CA|193|31p|9kb6|-e3et|j64h73
Dijon|dijon||FR|9c|3n4q|a57c|12t8|j64fox
Dikhil|dikhil||DJ|gn|9aj|2dog|92y0|j63xap
Dikson|dikson|dickson|RU|1p3|ux|fr6m|h9hn|j64mfj
Dila|dila||ET|1m3|10a5|1dgo|87lo|j64fxv
Dili|dili||TL|go|50t7|-1u1m|qwz7|j64mb5
Dillingham|dillingham||US|26|1x4|cnom|-xyub|j643mt
Dillon|dillon||US|147|3fz|9ovx|-o5h4|j6417t
Dilolo|dilolo||CD|tl|626|-2ak4|4sbp|j64fab
Dimbokro|dimbokro||CI|15l|1fyt|1fbd|-10cc|j64gkl
Dimitrovgrad|dimitrovgrad||RU|1ro|2u0y|bmlk|ameo|j64cdz
Dindigul|dindigul||IN|1of|4axp|283c|gpuo|j64kux
Dinguiraye|dinguiraye||GN|j7|4oe|2f6m|-2arg|j63yiz
Dingzhou|dingzhou||CN|nu|3a06|892k|oncg|j64etd
Diourbel|diourbel||SN|gq|367s|354c|-3hb4|j64b6d
Dire Dawa|dire dawa||ET|gr|5enr|21zw|8yzs|j64lxt
Dirj|dirj||LY|kp|pv|6grz|28on|j64dc1
Dispur|dispur|gauhati|IN|4n|cgc|5lq8|jo2q|j64l7x
Diu|diu||IN|fo|icj|4fvh|f7rk|j6488h
Divinópolis|divinopolis||BR|13l|45k8|-4bh3|-9mg8|j64gpp
Divo|divo||CI|1mm|2qnv|191y|-15cw|j63ykx
Diyarbakır|diyarbakir||TR|gy|dti3|84lg|8mf0|j64agt
Djado|djado||NE|n|a|4i5i|2myr|j64kab
Djambala|djambala||CG|1dc|7g3|-jlg|35t8|j64ghf
Djanet|djanet||DZ|pm|ii|59g9|215z|j64hzb
Djelfa|djelfa||DZ|gz|3nv9|7flc|p2s|j64l4l
Djenné|djenne||ML|14c|pf4|2z94|-z3w|j64mlh
Djibo|djibo||BF|1lf|h5b|30se|-cjy|j63zu5
Djibouti|djibouti||DJ|h0|js6w|2hgu|98xk|j64lrh
Djougou|djougou||BJ|h7|4chm|22uk|cyo|j64hz5
Dnipro|dnipro|dnipropetrovsk|UA|h1|mi6o|ae37|7i1p|j64lch
Doba|doba||TD|z4|mu5|1uqw|3m0k|j64eet
Dobrich|dobrich||BG|h2|2167|9caz|5ytc|j64i25
Dodge City|dodge city||US|sr|k0c|83cx|-lfqu|j648pb
Dodoma|dodoma||TZ|h3|4of1|-1bpl|7nuk|j64lnn
Doha|doha||QA|c|v2ts|5f42|b1mq|j64lgd
Dolbeau|dolbeau|dolbeau mistassini|CA|1fa|aah|ah22|-fhct|j64l0z
Doline|doline|deline|CA|18z|el|dyyh|-qgaf|j647jn
Dolinsk|dolinsk||RU|1he|991|a5cw|uluo|j64csl
Dolo Bay|dolo bay|dolo|ET|1l5|942|wa1|90pt|j64ktj
Dolores|dolores||AR|e4|jfq|-7sbo|-cd50|j647tf
Dombarovskiy|dombarovskiy|dombarovsky|RU|1ak|7dg|avmi|crew|j64cc3
Dondo|dondo||MZ|1l0|1ooo|-47dw|7fz8|j64bsv
Dondo|dondo||AO|fc|1td|-22ro|33cc|j64l37
Donegal|donegal||IE|h5|1xt|bpok|-1qmn|j64675
Donetsk|donetsk|donets k|UA|h6|l6cg|aadv|83vs|j64lcj
Đông Hà|dong ha||VN|1f1|dmm|3m0k|myn9|j63ten
Đồng Hới|dong hoi||VN|1ex|421d|3qwh|muj4|j64j1h
Dongguan|dongguan||CN|m6|2p1ts|4xv0|odn8|j64mw5
Dongola|dongola|karma|SD|18s|kdg|43w2|6j7l|j64mcp
Dori|dori||BF|1nl|t66|30ac|-7s|j6401h
Dortmund|dortmund||DE|189|cm26|b1lw|1lhg|j646fh
Dosso|dosso||NE|ha|12dy|2sp0|oow|j64k7x
Dothan|dothan||US|23|1bn1|6ox7|-iavm|j648x1
Douala|douala||CM|yz|14uog|vcg|22wo|j64ldh
Douglas|douglas||IM||rny|blts|-ykg|j64it1
Douglas|douglas||US|48|nah|6pyq|-nha4|j64jtp
Douglas|douglas||US|kn|add|6r46|-hra3|j648zn
Douglas|douglas||US|1uz|4uy|95wt|-ml5h|j648n7
Douliou|douliou|douliu|TW|1vs|2aal|52xf|pu4f|j6489t
Douma|douma|duma|SY|fw|amtt|774p|7sv4|j643ix
Dourados|dourados||BR|12r|3h5m|-4rj0|-bqx0|j64k0b
Dover|dover||US|g7|1mo7|8e59|-g6r3|j6431x
Dover|dover||GB|u1|s2o|ayjt|a14|j64atx
Drammen|drammen||NO|aj|1y02|ct38|26mr|j64bbh
Dresden|dresden||DE|1gy|d8h7|axwk|2y3g|j64lrj
Drobeta-Turnu Severin|drobeta turnu severin|drobeta turmu sererin|RO|133|2a8i|9khn|4uw3|j644pt
Drogheda|drogheda||IE|zm|s6t|bii1|-1cza|j64dof
Drohobych|drohobych||UA|wx|2nvx|akqs|51bm|j643xh
Drummondville|drummondville||CA|1fa|19wh|9u1d|-fjaa|j647lt
Dryden|dryden||CA|1aa|62e|ao4p|-jwb1|j64k1z
Dubai|dubai||AE|he|tk1k|5eov|buj0|j64n0p
Dubăsari|dubasari||MD|1qs|hxy|a4on|6908|j63w07
Dubbo|dubbo||AU|176|od2|-6wx4|vul1|j64m5v
Dublin|dublin||IE|hf|mp4o|bfja|-1c8d|j64mvh
Dublin|dublin||US|kn|hgf|6z27|-hrsv|j648zv
Dubrovnik|dubrovnik||HR|hg|sjm|9569|3vle|j64efb
Dubuque|dubuque||US|q1|1c7n|93xt|-jfkl|j648ob
Dudinka|dudinka||RU|1p3|i83|evmu|ihbe|j64ja7
Duhok|duhok|dahuk|IQ|gm|l4sw|7wgr|97sg|j640nt
Duisburg|duisburg||DE|189|rd5h|b0u4|1g30|j646fl
Duitama|duitama||CO|9e|261w|18zl|-fnfc|j64e5b
Dulan|dulan||CN|kc|2s|7r2a|l28a|j64lox
Duluth|duluth||US|13m|1tfk|a0zd|-jqp4|j64jt7
Dumas|dumas||US|1ph|ail|7ops|-lus5|j648v3
Dumfries|dumfries||GB|hh|nyc|bswf|-re4|j64adj
Dumont d'Urville Station|dumont d urville station||AQ||3c|-eb8n|tzyt|j64iwl
Dumyat|dumyat|damietta|EG|hi|6f2b|6qfw|6tiw|j64eg1
Dund-Us|dund us|hovd,khovd|MN|on|nj8|aahy|jn1p|j64lnb
Dundee|dundee||GB|hj|38yw|c3q8|-n5c|j64abz
Dundo|dundo||AO|zy|98x|-1ky0|4gq4|j64l33
Dunedin|dunedin||NZ|1ay|2itg|-9u1y|10jim|j64n67
Dunhua|dunhua||CN|r8|441q|9aht|rhco|j64eyb
Dunhuang|dunhuang||CN|kc|303i|8lqr|kaf0|j64lot
Duque de Caxias|duque de caxias||BR|1g1|i2dm|-4vp0|-9a6k|j647ft
Durango|durango||MX|hm|9sqc|55fb|-mfn0|j64je1
Durango|durango||US|ei|hxd|7zmc|-n4eo|j648jj
Durazno|durazno||UY|hn|q9h|-75sk|-c418|j64l8n
Durban|durban||ZA|wh|1mhpk|-6efb|6n11|j64mux
Durham|durham||US|18e|6mt3|7ps0|-gwy8|j642sh
Durrës|durres||AL|ho|31wg|8ut6|462a|j64hnj
Dushanbe|dushanbe||TJ|1ny|na5g|89j4|eqnv|j64mc1
Düsseldorf|dusseldorf||DE|189|q5cw|az7w|1gbc|j64ekh
Dutse|dutse||NG|r5|d7t|2j1k|205b|j640il
Dyatkovo|dyatkovo||RU|9y|pvb|bhhv|7cyo|j645bj
Dzaoudzi|dzaoudzi||YT|14y|oqh|-2qnz|9pce|j64itv
Dzerzhinsk|dzerzhinsk||RU|17t|5hy1|c214|9bc8|j64bzj
Dzhankoy|dzhankoy|dzhankoi|RU|f8|xuv|9sr6|7dfk|j649ml
Dzuunmod|dzuunmod|zuunmod|MN|1ri|doq|a852|mx7i|j63w81
Eagle|eagle||US|26|2w|dvwo|-u9i8|j643t5
East London|east london||ZA|i0|79ab|-72ec|5z1o|j64lhn
Eastmain|eastmain||CA|1fa|9b|b719|-gtu7|j647mf
Eau Claire|eau claire||US|1uw|1pj0|9lrm|-jm08|j642zb
Ebebiyín|ebebiyin||GA|1uy|j5r|gm2|2ff8|j63xyz
Ebolowa|ebolowa||CM|1ml|1vsz|mdk|2e18|j64m2n
Echuca|echuca||AU|176|f0h|-7qs0|v0wc|j64ia1
Ed Dueim|ed dueim||SD|1uu|1v6k|2zy8|6x88|j64aaz
Edéa|edea||CM|yz|4cr1|tbp|2634|j64hlj
Edinburg|edinburg||US|1ph|37qo|5myg|-l1eo|j648t3
Edinburgh|edinburgh||GB|i4|atmu|bzp7|-ou7|j64j25
Edirne|edirne||TR|i5|2pl2|8xj4|5p0k|j64aeb
Edmonton|edmonton||CA|29|mocw|bh7k|-obsb|j64mzj
Edmundston|edmundston||CA|171|dt2|a5ky|-en9h|j64h6l
Eger|eger||HU|o4|17pj|a9k6|4d9y|j63u7p
Egilsstaðir|egilsstadir||IS|58|1qx|dzlu|-332m|j64a7t
Egvekinot|egvekinot||RU|dw|1qg|e7qt|-12el9|j64bwz
Eidsvold|eidsvold||AU|1f2|cr|-5fq6|we5h|j64ijb
Eindhoven|eindhoven||NL|17z|8j51|b0u4|16fs|j6451t
Eirunepé|eirunepe||BR|2q|gs6|-1fe0|-ez5e|j64kvl
Eisenstadt|eisenstadt||AT|ab|a5p|a931|3jkl|j63zln
Ekibastuz|ekibastuz||KZ|1c5|2qnw|b35g|g567|j64lyb
El Agheila|el agheila|al ugaylah|LY|y|2s|6hgq|445c|j64ddz
El Alamein|el alamein||EG|12s|5pk|6lsb|67do|j64egb
El Arish|el arish|arish|EG|1jq|3tuj|6o5t|78t2|j64eit
El Banco|el banco||CO|10q|162i|1xg3|-fuu0|j64eah
El Bayadh|el bayadh||DZ|i9|1g0l|77yg|7sk|j64hzn
El Calafate|el calafate||AR|1in|668|-asdh|-fhvc|j64m2v
El Carmen de Bolívar|el carmen de bolivar||CO|8y|1b1w|2304|-g3pg|j64e9z
El Cayo|el cayo|san ignacio|BZ|c6|d3l|3odk|-j376|j640sp
El Centro|el centro||US|bb|yq0|7110|-orng|j648gn
El Daba|el daba|el dabaa|EG|12s|ays|6ngi|63e5|j64egf
El Dorado|el dorado||US|49|hao|74a3|-juzl|j648nx
El Dorado|el dorado||VE|8u|1u7|1fyd|-d7kd|j64jwz
El Faiyum|el faiyum|faiyum|EG|1b|6sf8|6a5o|6lyo|j64lr5
El Fasher|el fasher|al fashir|SD|18v|5ewx|2x64|5flo|j64kb5
El Fuerte|el fuerte||MX|1kj|8mb|5nv0|-na48|j64cv7
El Goléa|el golea|el menia|DZ|ks|oq9|6juq|m8x|j64l4b
El Jadida|el jadida||MA|hb|3v92|74n0|-1tnw|j64brz
El Kef|el kef|le kef|TN|y5|110r|7r6q|1v8s|j649f1
El Kharga|el kharga|el kharga town|EG|1y|12kn|5gao|6jq4|j64knp
El Maitén|el maiten||AR|dv|3al|-90gk|-f94i|j647ph
El Manaqil|el manaqil||SD|ko|395f|31yg|72h4|j64a9p
El Mansura|el mansura|sharkia|EG|b|cuyo|6nl4|6q4o|j64efx
El Manteco|el manteco||VE|8u|1pj|1kps|-deid|j6498z
El Minya|el minya|minya|EG|1t|apsw|60qs|6l9o|j64knl
El Oued|el oued||DZ|8d|3syh|75hk|1gxk|j64hzt
El Paso|el paso||US|1ph|g50o|6t8b|-mtun|j64lap
El Porvenir|el porvenir||PA|w8|a|21mh|-gxco|j640hd
El Progreso|el progreso||GT|id|35kt|36l0|-jakn|j63xkz
El Qasr|el qasr||EG|1y|1bo|5ib0|66v5|j64ehj
El Seibo|el seibo|santa cruz del seibo|DO|ie|i63|40s8|-esoe|j63xvf
El Tigre|el tigre||VE|3i|48cg|1wlj|-dru0|j6499d
El Tur|el tur|el tor|EG|qt|lbg|61wa|77dg|j64eip
Elâzığ|elazig||TR|if|5thg|8agg|8ep8|j644gh
Elbasan|elbasan||AL|ig|3jbm|8tan|4ayu|j64835
Elbląg|elblag||PL|1u7|2qfa|bm4s|45pn|j6461f
Eldama Ravine|eldama ravine||KE|1fx|dkd|e0|7nm8|j64b9h
Eldikan|eldikan||RU|1hd|164|d14w|sz2x|j64jbt
Eldorado|eldorado||AR|13r|ded|-5m5s|-bpao|j64825
Eldorado|eldorado|el dorado|MX|1kj|ded|57qh|-n0h0|j64cvd
Eldoret|eldoret||KE|1fx|7ko5|40g|7k58|j64loh
Elephant Island|elephant island||AQ||6|-dae4|-cfj4|j64iup
Elgin|elgin||US|pl|8cju|90dn|-ix8z|j642nx
Elista|elista||RU|sd|2ajf|9xh3|9h47|j64kfl
Ełk|elk||PL|1u7|1715|bjdt|4sgc|j64dep
Elkhart|elkhart||US|pv|3746|8xml|-ifc8|j642qj
Elko|elko||US|16z|eus|8r2d|-ot84|j64l9v
Elmira|elmira||US|178|1c4o|90rp|-ggnk|j6497v
Ely|ely||US|16z|394|8ety|-omh9|j64ixn
Ely|ely||US|13m|2vn|a9lo|-joj5|j648bv
Embi|embi||KZ|3s|eh4|agr0|cgn6|j64g0f
Embu|embu||KE|hz|198c|-40c|80ys|j64b8p
Emden|emden||DE|17i|13ra|bfs3|1jon|j646gh
Emerald|emerald||AU|1f2|792|-51f6|vr9l|j64imj
Emmonak|emmonak||US|26|2s|dge2|-z9gu|j643on
Emporia|emporia||US|sr|mew|88bu|-km52|j648p1
En Nuhud|en nuhud|en nahud|SD|1lt|2bc8|2px4|63ag|j64av3
Encarnación|encarnacion||PY|qf|7njz|-5v0g|-bz4j|j644zh
Ende|ende||ID|19g|1nkl|-1wdr|q2nd|j64e25
Engels|engels||RU|1iz|478r|b1do|9vv4|j64ccx
Enid|enid||US|1a3|zlm|7stv|-kz8d|j641u3
Ennadai|ennadai||CA|19e|0|d3ph|-lmf5|j64kzz
Ensenada|ensenada||MX|61|5hyt|6tws|-ozug|j64jdt
Entebbe|entebbe||UG|1u3|3r4o|gs|6ygo|j64alj
Enterprise|enterprise||US|23|iod|6pq6|-iedk|j648xf
Entre Ríos|entre rios||BO|1os|22l|-4m4k|-drak|j6486l
Enugu|enugu||NG|ik|erj2|1dro|1lvc|j64mgj
Enurmino|enurmino||RU|dw|89|ecl8|-10tqu|j6459z
Er Rachidia|er rachidia|errachidia|MA|134|4wax|6ugc|-yc4|j64brn
Erdenet|erdenet||MN|1al|1pgf|aihx|mbdr|j64mgp
Erechim|erechim||BR|1g0|2253|-5x70|-b7bg|j647ah
Ereğli|eregli||TR|vn|1z2t|81ef|7aqt|j64ajn
Erenhot|erenhot||CN|16t|h73|9cw8|nzxj|j64jnf
Erfurt|erfurt||DE|1pq|4cty|axad|2d3w|j646gp
Erie|erie||US|1cd|3thi|912r|-h5xu|j6498h
Erldunda|erldunda||AU|18x|a|-5ep9|sjs0|j64k41
Ermoupoli|ermoupoli|ermoupolis|GR|190|9gk|80yw|5cdx|j64fvn
Ertis|ertis||KZ|1c5|740|bfm5|g66b|j64g3b
Erymentau|erymentau|ereymentau|KZ|3q|jed|b2dr|fo2x|j64g2f
Erzincan|erzincan||TR|in|2run|8iqf|8gq8|j64agj
Erzurum|erzurum||TR|io|90lv|8k10|8ulg|j64agf
Esbjerg|esbjerg||DK|1nf|1jpp|bvzi|1t78|j64ght
Escanaba|escanaba||US|13e|dd2|9sz5|-insk|j649bz
Escudero Base|escudero base|profesor julio escudero base|AQ||k|-dbwe|-cmvr|j64iun
Escuinapa|escuinapa|escuinapa de hidalgo|MX|1kj|lso|4wbc|-mocw|j64cuv
Escuintla|escuintla||GT|ip|2b1y|32cc|-jggo|j64fct
Escuintla|escuintla||MX|d8|2b1y|3aac|-juqk|j645zl
Eséka|eseka||CM|ce|h59|s60|2b2q|j64hm5
Esik|esik||KZ|2e|r93|9amz|glk6|j64647
Esil|esil||KZ|3q|af4|b4wi|e867|j64g1n
Eskişehir|eskisehir||TR|ir|b19x|8j26|6jkk|j64k3n
Esmeraldas|esmeraldas||EC|is|3pkd|76g|-h2qk|j64e7d
Esperance|esperance||AU|1uo|634|-798t|q4i1|j64k4v
Esperanza|esperanza||MX|1la|2yk|5wt4|-nk84|j645st
Esperanza Base|esperanza base|esperanza station|AQ||6y|-dl09|-c80j|j64iw7
Espungabera|espungabera||MZ|11i|ax|-4dsl|70us|j64bjv
Esquel|esquel||AR|dv|fgw|-970o|-faa6|j64k2l
Essen|essen||DE|189|11c8n|b0zo|1i52|j646fv
Estância|estancia||BR|1jj|16xy|-2eyg|-80ys|j64gy1
Estelí|esteli||NI|ix|2b7j|2t04|-iicw|j644zv
Etawah|etawah||IN|1sa|5inc|5qof|gxom|j64gbz
Eugene|eugene||US|1ai|595y|9fw4|-qdug|j64ju7
Eumseong|eumseong||KR|dy|7rx|7wzt|rd9d|j644id
Eureka|eureka||US|bb|wpq|8qty|-qlxf|j64l9n
Evanston|evanston||US|pl|7i28|90g3|-isp4|j642n5
Evansville|evansville||US|pv|3qc6|850j|-irl2|j64jvx
Evensk|evensk||RU|10n|1k8|da0c|y4nh|j64jdd
Everett|everett||US|1u8|afp3|aa2c|-q6wg|j648et
Evinayong|evinayong||GQ|cf|6j2|b6s|29j7|j63x5z
Évora|evora||PT|1x1|16x0|89j4|-1p04|j63vf1
Ewo|ewo||CG|fk|87u|-6sc|36co|j64ffn
Exeter|exeter||GB|gd|2fa6|av7g|-r8j|j64acj
Exmouth|exmouth||AU|1uo|u5|-4p7z|ogkx|j64k4f
Eyl|eyl||SO|19d|el4|1pll|aoil|j64kg5
Eyumojok|eyumojok|eyumodjock|CM|1mq|4h2|18dc|1xbd|j64h8p
Fada|fada||TD|82|cg|3olj|4mla|j64kn3
Fada Ngourma|fada ngourma|fada n gourma|BF|li|q5y|2l0m|2sa|j63zgv
Fairbanks|fairbanks||US|26|17z5|dwaa|-vnqr|j64mal
Faisalabad|faisalabad||PK|1ei|1k3ag|6qdj|fo3t|j64j4v
Faizabad|faizabad||IN|1sa|3a3b|5qeo|hm10|j64gb3
Falfurrias|falfurrias||US|1ph|44l|5u31|-l1ah|j648ul
Falmouth|falmouth||JM|1qw|603|3yl8|-gn74|j63x0x
False Pass|false pass||US|26|z|br8g|-z0x2|j649if
Falun|falun||SE|fv|s59|czoy|3cqe|j63ump
Famagusta|famagusta||||wta|7j0y|79yk|j6488x
Farafangana|farafangana||MG|jf|j3w|-4w1y|a930|j64kld
Farah|farah||AF|j6|1ktr|6xxp|db54|j64l31
Faranah|faranah||GN|j7|f0t|25h0|-2ay4|j64gjb
Fargo|fargo||US|18f|3hne|a1pg|-kqty|j64l93
Fargona|fargona|fergana|UZ|je|g2pc|8nng|fduw|j64j0x
Faribault|faribault||US|13m|jkw|9hqx|-jzns|j6414b
Faridabad|faridabad||IN|ni|tvm8|63ep|gkkb|j64lv3
Farim|farim||GW|19z|58o|2oea|-39hq|j63wgv
Farmington|farmington||US|175|xe6|7vli|-n6rp|j641jb
Faro|faro||PT|j8|vwr|7xmj|-1p7p|j64b5x
Fasa|fasa||IR|j9|2o16|67jq|bi4r|j64g57
Fatehpur|fatehpur||IN|1sa|3kgg|5jp0|hbgg|j64gax
Fatick|fatick||SN|jb|ipf|32og|-3io0|j63vj1
Faya Largeau|faya largeau|faya|TD|82|ac8|3u8v|43i7|j64kn5
Fayetteville|fayetteville||US|18e|57qi|7ijp|-gwo4|j6493b
Fayetteville|fayetteville||US|49|3913|7q9i|-k6is|j648nt
Fderik|fderik|fderick|MR|1pz|4g0|4uzq|-2q1q|j640mp
Feira de Santana|feira de santana||BR|5z|abuf|-2mis|-8cp0|j64mnj
Felipe Carrillo Puerto|felipe carrillo puerto||MX|1f8|j53|4730|-ivec|j64d35
Fengcheng|fengcheng||CN|r4|1bfh|61lg|otac|j64ewd
Fengjie|fengjie||CN|dt|11xs|6nl4|nh1b|j64dw3
Fengzhen|fengzhen||CN|16t|24iu|8o5f|o90z|j64f1h
Ferfer|ferfer||SO|o8|4mo|138m|9ohu|j64ci7
Ferkessédougou|ferkessedougou||CI|1j7|1bug|222s|-144g|j64gi5
Fernandópolis|fernandopolis||BR|1nj|1bsb|-4ceg|-art4|j64hk7
Ferrara|ferrara||IT|ih|2t2o|9m2g|2hkz|j64dq7
Ferreñafe|ferrenafe||PE|xp|12q0|-1f5o|-h3qo|j644sj
Feyzabad|feyzabad|fayzabad|AF|5q|1dxc|7yhu|f4lc|j64hpp
Fez|fez|f s,fes|MA|jy|lh5c|7as5|-12lj|j64mdp
Fianarantsoa|fianarantsoa||MG|jf|3y48|-4ldp|a3ap|j64lpt
Fier|fier||AL|jg|1ri1|8q9w|470y|j63yo1
Filadelfia|filadelfia||PY|91|82u|-4sdk|-cv70|j64k9v
Finnsnes|finnsnes||NO|1r1|30j|eu9i|3uye|j6451l
Firozabad|firozabad||IN|1sa|6kfd|5tho|gswd|j6472l
Flagstaff|flagstaff||US|48|1ddl|7jl9|-nxi1|j64l9f
Flensburg|flensburg||DE|1ja|23ka|bqpp|20sd|j64elv
Flin Flon|flin flon||CA|11m|4xl|bqky|-lu4x|j64kyn
Flint|flint||US|13e|6bsc|97w1|-hxqj|j649b7
Florence|florence||IT|1qi|w5eo|9dt4|2et0|j64lo7
Florence|florence||US|1ll|18bi|7but|-h3gc|j6490l
Florence|florence||US|23|yzp|7gil|-isis|j642bp
Florencia|florencia||CO|bs|2skh|cfc|-g7hk|j64e8z
Flores|flores||GT|1co|tcj|3mnt|-j9jl|j64fcf
Floriano|floriano||BR|1d3|11hn|-1g8g|-980s|j64gvb
Florianópolis|florianopolis||BR|1im|lxco|-5wsk|-aeec|j64mnh
Florida|florida||UY|jl|ove|-7b3y|-c1ra|j63t33
Focșani|focsani||RO|1ts|293s|9sli|5trt|j644sd
Foggia|foggia||IT|3m|3br7|8vwt|3c28|j64drp
Fond du Lac|fond du lac||US|1uw|15wb|9dra|-iygl|j6495f
Fonte Boa|fonte boa||BR|2q|ce4|-jea|-e5ys|j64kvj
Forbes|forbes||AU|176|3qe|-75mw|vq4o|j64ibd
Forecariah|forecariah||GN|uy|9ja|20rg|-2t2c|j63yhf
Formiga|formiga||BR|13l|17is|-4dvc|-9qjg|j6477p
Formosa|formosa||AR|jm|4qtj|-5ly8|-cgxw|j64m3f
Formosa|formosa||BR|l8|1qog|-3bwj|-a5a0|j64hdl
Forster-Tuncurry|forster tuncurry|forster|AU|176|dkn|-6wej|wowi|j64k55
Fort Chipewyan|fort chipewyan||CA|29|2hi|cl2b|-ntn0|j64gzx
Fort Collins|fort collins||US|ei|4w81|8oyv|-min1|j648iv
Fort-de-France|fort de france||MQ|127|5fzf|34qg|-d3ao|j64ech
Fort Good Hope|fort good hope||CA|18z|gl|e7be|-rkjh|j64mob
Fort Lauderdale|fort lauderdale||US|jl|17rne|5lo1|-h6dm|j648yn
Fort-Liberté|fort liberte||HT|182|8uh|47qo|-fecw|j63tld
Fort McMurray|fort mcmurray||CA|29|gvb|c5r9|-nvft|j64m1l
Fort McPherson|fort mcpherson||CA|18z|tp|egrn|-swuu|j64h27
Fort Nelson|fort nelson||CA|9r|4vf|cltz|-q9gy|j64kzj
Fort Pierce|fort pierce||US|jl|4w45|5vs4|-h7sq|j648y1
Fort Portal|fort portal||UG|rt|wxa|56e|6hlq|j63u1z
Fort Resolution|fort resolution||CA|18z|cg|d3yq|-od6m|j64l03
Fort Severn|fort severn||CA|1aa|3h|bzyx|-isb8|j64mol
Fort Shevchenko|fort shevchenko||KZ|11g|40t|9jhv|aruy|j64g7f
Fort Simpson|fort simpson||CA|18z|7v|d98k|-q07p|j64l05
Fort Smith|fort smith||US|49|20is|7l1i|-k8ds|j648np
Fort Smith|fort smith||CA|29|ee|cuyo|-nzap|j64m1j
Fort St. John|fort st john||CA|9r|ehk|c210|-pwct|j64m1p
Fort Stockton|fort stockton||US|1ph|5yh|6md1|-m1v6|j648uv
Fort Wayne|fort wayne||US|pv|6fdr|8sz8|-i8v8|j6492t
Fort William|fort william||GB|o7|7g4|c6ed|-13g1|j6489b
Fort Yukon|fort yukon||US|26|n5|e9m7|-v4xu|j64jy5
Fortaleza|fortaleza||BR|c8|257kf|-sx5|-89p7|j64mzf
Forteau|forteau||CA|179|cg|b0zs|-c7fg|j64h83
Fortin Falcon|fortin falcon||PY|1e2|0|-4xuv|-ctsz|j644xb
Foshan|foshan||CN|m6|k7mg|4xps|o8tp|j64jh1
Foumban|foumban||CM|1b6|1zi9|187s|2c3s|j64h8d
Fox Bay|fox bay|fox bay west|FK||3c|-b4uq|-cvmu|j64isv
Foz do Iguaçu|foz do iguacu||BR|1bw|9fuv|-5gxv|-bor8|j64gtf
Franca|franca||BR|1nj|6jdd|-4ees|-a5nw|j64l2v
Franceville|franceville|masuku|GA|no|x5j|-clp|2wt5|j64lw1
Francistown|francistown||BW|cb|1xff|-4jck|5w6w|j64m4z
Frankfort|frankfort||US|u3|sb4|86rc|-i6vy|j64izl
Frankfurt|frankfurt|frankfurt am main|DE|o3|1q1so|aqko|1uxq|j64mwn
Frauenfeld|frauenfeld||CH|1po|gyj|a71c|1ya0|j63ul5
Fredericksburg|fredericksburg||US|1tg|2uq6|87jv|-glow|j6494j
Fredericton|fredericton||CA|171|14dt|9ujw|-ea59|j64l1d
Frederikshavn|frederikshavn||DK|187|ilj|cb5t|299x|j64ghx
Freeport|freeport||US|1ph|1lsc|67gb|-kfs1|j64iyl
Freeport|freeport||BS||jl3|5oqd|-gv94|j64m7p
Freetown|freetown||SL|1un|hq48|1tdc|-2u4q|j64mch
Freiburg|freiburg|freiburg im breisgau|DE|5r|5go9|aadg|1oq3|j64ekp
Fresnillo|fresnillo||MX|1vx|29e8|4ys8|-m1o8|j64cwv
Fresno|fresno||US|bb|d7kx|7vjp|-po6a|j64l9l
Fria|fria||GN|8s|ib5|283g|-2wjw|j64git
Frias|frias||AR|1iv|ahm|-6528|-dyp8|j64hhj
Fribourg|fribourg||CH|jp|pbv|a140|1j64|j63wc3
Frolovo|frolovo||RU|1tl|vjm|ao1m|9cti|j64c3h
Frontera|frontera||MX|1ns|hgd|3zd8|-juw4|j64d0l
Frutal|frutal||BR|13l|vkz|-4ajw|-ahmg|j6477v
Ft. Dodge|ft dodge|fort dodge|US|q1|kqn|93zg|-k6p7|j641ov
Ft. Myers|ft myers|fort myers|US|jl|41j2|5pk3|-hjn1|j64jvh
Ft.  Worth|ft worth|fort worth|US|1ph|uvgm|70mg|-kv2w|j64lah
Fuan|fuan|fu an|CN|ju|1zcm|5svk|pmzs|j64dwt
Fuerte Olimpo|fuerte olimpo||PY|2i|1wr|-4iko|-cerc|j64b3h
Fujin|fujin||CN|nw|1x0i|a4qo|sao8|j64f1z
Fukui|fukui||JP|jv|5bwj|7qbk|t72w|j64f5b
Fukuoka|fukuoka|fukuoka kitakyushu|JP|jw|1nubk|778i|ry8h|j64lt3
Fukushima|fukushima||JP|jx|6b19|837c|u3vg|j64jop
Fulacunda|fulacunda||GW|1f6|10f|2iua|-398u|j63wh3
Fulin|fulin||CN|1k9|t5|6ags|m0kf|j64jkd
Funafuti|funafuti||TV||3nx|-1tpr|12eue|j64l5b
Funchal|funchal||PT|10g|4dzz|6zxg|-3m8w|j64ka1
Funtua|funtua||NG|tm|3v97|2gw4|1khc|j64dat
Fürth|furth||DE|7i|53is|alpo|2cvk|j646hd
Fushun|fushun|fushun liaoning|CN|yg|vi9c|8z1t|qjrt|j64jlz
Fuxin|fuxin||CN|yg|gi4w|9064|q2px|j64jlv
Fuyang|fuyang||CN|1wg|giwo|6fwp|ppjg|j64kon
Fuyang|fuyang||CN|36|3n6v|71v0|oto8|j64dxp
Fuzhou|fuzhou|fuzhou fujian|CN|ju|1jusw|5l8z|pkid|j64mw1
Gaalkacyo|gaalkacyo|galkayo|SO|153|1b80|1g8k|a5z0|j64kg3
Gabès|gabes||TN|k1|4pdp|79ks|25xk|j649fb
Gaborone|gaborone||BW|1lx|4gt7|-5a67|5jxr|j64mr5
Gabú|gabu||GW|k2|b4u|2mr4|-31tw|j63whn
Gadabay|gadabay||AZ|jz|6oh|8p08|9tip|j63z1h
Gadsden|gadsden||US|23|w6l|7agi|-ifmq|j648xb
Gafsa|gafsa||TN|k3|2pub|7dl8|1vqw|j649ff
Gagnoa|gagnoa||CI|js|2n1s|1bgg|-19dc|j64gjv
Gainesville|gainesville||US|jl|43g9|6csi|-hn82|j64jvf
Galați|galati||RO|k5|6o38|9qqn|60ej|j644rz
Galena|galena||US|26|dw|dvhh|-xmuu|j64jxv
Galesburg|galesburg||US|pl|ori|8rye|-jdb3|j642lp
Galle|galle||LK|k8|24ra|1aj0|h74w|j64j2j
Gallup|gallup||US|175|id4|7m3t|-nazw|j648kx
Galveston|galveston||US|1ph|1gxw|6a37|-kbgn|j64iyj
Galway|galway||IE|k9|1mbu|bf1w|-1xtk|j64don
Gamba|gamba||GA|19u|7ns|-kg4|255s|j64kqf
Gambell|gambell||US|26|ix|do4l|-10t33|j64j0f
Gamboma|gamboma||CG|1dc|g3x|-ei3|3eas|j64ghb
Ganca|ganca|ganja|AZ|k0|6i04|8pxe|9xn0|j6483n
Gandajika|gandajika||CD|tb|3b5l|-1g04|54vk|j64fa1
Gander|gander||CA|179|2kx|ahp8|-bows|j64l1j
Gandhinagar|gandhinagar||IN|fo|475f|4zsc|fkhr|j64gg3
Gangneung|gangneung||KR|kb|3vcz|83br|rmki|j64cjh
Gangtok|gangtok||IN|1kg|1o3w|5uwl|izrq|j64735
Gannan|gannan||CN|nw|19pj|a9r8|qh0c|j64f2h
Ganzhou|ganzhou||CN|r4|w5eo|5k00|omyk|j64jmf
Gao|gao||ML|ke|2i93|3hii|-dw|j64lwb
Gaoua|gaoua||BF|1dm|lmf|27o2|-oho|j6400p
Gaoual|gaoual||GN|8s|5r9|2ip0|-2tya|j63ygh
Gar|gar||CN|1v3|7ps|6wgk|h55l|j64eov
Garanhuns|garanhuns||BR|1cj|2cxx|-1wlg|-7tmw|j64l2x
Garbahaarey|garbahaarey|garbahaareey|SO|kk|9rg|po6|91tq|j63w1l
Garça|garca||BR|1nj|vva|-4rg8|-an6g|j6481b
Garden City|garden city||US|sr|m1g|850o|-lm9t|j641qb
Gardiz|gardiz|gardez|AF|1bj|27xt|779d|eu2a|j64is5
Garissa|garissa||KE|18p|1gd1|-3e4|8i3g|j64bal
Garoowe|garoowe||SO|19d|1zc|1stc|ae88|j64kg7
Garoua|garoua||CM|181|9d43|1zrc|2vbg|j64m3x
Gary|gary||US|pv|co5o|8wu4|-ipuc|j6492p
Garzón|garzon||CO|oz|17ob|h20|-g7pw|j64e9d
Gashua|gashua||NG|1vk|2p2x|2rb5|2d6o|j64dbb
Gaspé|gaspe||CA|1fa|2u5|agtx|-dtmu|j64l0v
Gastre|gastre||AR|dv|fh|-929a|-eu7h|j64hap
Gatchina|gatchina||RU|ya|1xti|crnf|6gid|j64by7
Gavarr|gavarr|gavar|AM|kl|gq8|8net|9o77|j63z0t
Gävle|gavle||SE|mp|1gyj|d03y|3ogi|j649lf
Gawler|gawler||AU|1lj|cmi|-7f16|tqf4|j64igb
Gay|gay|gai|RU|1ak|w43|b16j|cj1b|j64ccd
Gaya|gaya||IN|86|92x8|5bcw|i7v4|j64jsz
Gaya|gaya||NE|ha|pi3|2jqa|qlf|j64awj
Gaza City|gaza city|gaza|PS||au78|6rac|7ds2|j64m7h
Gaziantep|gaziantep|aintab|TR|ki|mdk0|7y35|80g6|j64k7d
Gbadolite|gbadolite||CD|1x0|12yl|x3s|4i6v|j64edj
Gbarnga|gbarnga||LR|8z|zd7|1i3c|-2184|j64b77
Gdańsk|gdansk|danzig|PL|1dk|fuzk|bng0|3zts|j64lmz
Gdynia|gdynia||PL|1dk|6qso|book|3yz8|j64dev
Gedaref|gedaref|al qadarif|SD|kj|4bb6|30c0|7kzs|j64kap
Geelong|geelong||AU|1t8|3g7z|-86i3|uy5w|j64k5z
Geita|geita||TZ|15c|16o|-m46|6w76|j64aoj
Gejiu|gejiu||CN|1vt|371t|50eg|m3wt|j64lsh
Gelendzhik|gelendzhik||RU|vz|16tw|9jxw|85pg|j64c4j
Gemena|gemena||CD|1x0|48tk|p5k|48jo|j64kn1
Gen. O'Higgins Base|gen o higgins base|base general bernardo o higgins riquelme|AQ||18|-dkn8|-ceog|j64iw5
Geneina|geneina||SD|1uf|3hr9|2vs4|4t5c|j64lfl
General Conesa|general conesa||AR|1fc|2a6|-8lew|-dt65|j647uj
General Eugenio Alejandrino Garay|general eugenio alejandrino garay|fortin coronel eugenia garay|PY|90|r0|-4ec0|-dc0k|j644wp
General Guemes|general guemes||AR|1hk|fas|-5abu|-dxxg|j647wn
General Pico|general pico||AR|x5|1805|-7n5g|-do1w|j64hfj
General Roca|general roca||AR|1go|1kho|-8d2w|-ehok|j647u5
General Santos|general santos||PH|1lm|kdfm|1b5g|qtur|j64lk7
Genhe|genhe||CN|16t|x29|avuh|q1mn|j646n7
Genoa|genoa||IT|yl|dvm1|9io4|1wwk|j64kjt
Gent|gent|gand,ghent|BE|hv|9iuo|axr0|sjs|j6483f
George|george||ZA|1up|3qpi|-79yk|4t84|j64lgp
George Town|george town|penang,pinang|MY|1eg|1hl0g|15rs|li5a|j64lol
George Town|george town||KY||3ak|44ro|-hfjo|j64isx
Georgetown|georgetown||GY|ht|5nz2|1ghg|-cgti|j64mbd
Georgetown|georgetown|janjanbureh|GM|10d|2rk|2wk6|-35xy|j63xw7
Georgetown|georgetown||AU|1f2|mq|-3x7c|urid|j64k6h
Georgievsk|georgievsk|georgiyevsk|RU|1mb|1k21|9gqn|9bez|j6459f
Gera|gera||DE|1pq|28r7|awio|2l4s|j64ell
Geraldton|geraldton||AU|1uo|l16|-65yq|ok9c|j64m5n
Geraldton|geraldton|greenstone|CA|1aa|zu|anm6|-in1e|j647k7
Ghanzi|ghanzi||BW|kq|4v6|-4nfo|4mz4|j64ha7
Ghardaia|ghardaia||DZ|ks|2otk|6yp0|sbg|j64mqx
Gharyan|gharyan||LY|13x|35a2|6w88|2sgo|j64dd5
Ghat|ghat||LY|kt|isb|5cmn|26hs|j64ksb
Ghaziabad|ghaziabad||IN|1sa|sqq0|655r|gl9s|j64l85
Ghazni|ghazni||AF|ku|30so|76z5|enwy|j64hpl
Gießen|giessen||DE|o3|1rjq|aub1|1uqs|j64ekv
Gifu|gifu||JP|kx|8ulb|7lbr|tb9o|j64f47
Gijón|gijon||ES|1e8|778k|9bvo|-17r0|j644a7
Gikongoro|gikongoro||RW|1m0|bko|-j5t|6c4z|j63u9f
Gila Bend|gila bend||US|48|1m0|728w|-o5sf|j648f5
Gilgit|gilgit||PK|18t|4n94|7p4z|fxaw|j64bdl
Gillam|gillam||CA|11m|zl|c2ss|-kapk|j64k1f
Gillette|gillette||US|1uz|mgp|9how|-mm30|j648nf
Gimbi|gimbi||ET|g|ojl|1yqe|7ohp|j64fyp
Gimli|gimli||CA|11m|20v|auot|-ksgg|j647h3
Gingin|gingin||AU|1uo|146|-6pw8|ouag|j64i8t
Gingoog|gingoog||PH|13q|62|1w4w|qtic|j64clv
Girardot|girardot||CO|ff|2sj5|x98|-g18k|j646d7
Giresun|giresun||TR|kz|24a8|8roq|887w|j63tpn
Girga|girga||EG|1ms|2qyi|5n60|6tzk|j64ehz
Gisborne|gisborne||NZ|l0|qgs|-8abt|125lh|j64n5f
Gitarama|gitarama|muhanga|RW|1m0|1vlp|-fyw|6dmo|j64avf
Gitega|gitega||BI|155|hvj|-qfo|6e9w|j64is1
Giurgiu|giurgiu||RO|l1|1haj|9eys|5jds|j63ucd
Giyon|giyon|waliso|ET|g|2gdi|1ttk|84z8|j64fxz
Giza|giza|el giza|EG|1l|1lhc7|6fk4|6onw|j64jib
Gizo|gizo||SB|dq|4qy|-1qhw|xm5a|j64bpl
Gjirokastër|gjirokaster||AL|l2|i31|8l92|4bgy|j63yvj
Gjoa Haven|gjoa haven||CA|19e|ut|epkt|-kk3j|j64kzt
Gjøvik|gjovik||NO|1ac|hj3|d14w|2ak8|j6451z
Gladstone|gladstone||AU|1f2|nix|-541x|wf0z|j64k6x
Glarus|glarus||CH|l3|4dt|a31g|1xyj|j63ujl
Glasgow|glasgow||GB|l4|ov28|bz58|-wtb|j64mbj
Glasgow|glasgow||US|147|2i0|absg|-musx|j648ch
Glazov|glazov||RU|1rm|25ok|cghc|ba34|j64cbf
Glendale|glendale||US|48|apsw|774b|-o1pi|j641an
Glendive|glendive||US|147|4io|a3hq|-mfy9|j64177
Glenwood Springs|glenwood springs||US|ei|at0|8h56|-n04f|j641gf
Gliwice|gliwice||PL|1kh|avpy|asco|4024|j64dfv
Goba|goba||ET|g|qip|1i38|8kes|j64kt7
Gobabis|gobabis||NA|1a7|cld|-4t9i|42bi|j63wa3
Gobernador Gregores|gobernador gregores||AR|1in|1xz|-agaa|-f21w|j647oz
Gode|gode||ET|1l5|1lvc|19ws|9b9g|j64kth
Gogrial|gogrial||SS|1u5|12mp|1tuh|60y7|j64a9l
Goiana|goiana||BR|1cj|1j7h|-1mbw|-7i28|j64hkl
Goianésia|goianesia||BR|l8|10y3|-3a4o|-aj38|j64hcz
Goiânia|goiania||BR|l8|17c6o|-3kzx|-akf0|j64mzn
Gold Coast|gold coast||AU|1f2|bb58|-60of|ww0i|j64m6l
Goldsboro|goldsboro||US|18e|10qa|7l17|-gpsr|j64935
Golfito|golfito||CR|1ej|589|1uqs|-htl8|j646bx
Golmud|golmud||CN|kc|2ams|7szq|kc4h|j64loz
Golyshmanovo|golyshmanovo||RU|1rf|acw|c31n|enk3|j64cfj
Goma|goma|gisenyi|CD|183|337g|-cyc|69h6|j64lut
Gombe|gombe||NG|la|5sm6|27eg|2e6s|j64d9p
Gómez Palacio|gomez palacio||MX|hm|8k4g|5hat|-m6m0|j645rz
Gonaïves|gonaives||HT|ww|3kly|462w|-fkts|j64abh
Gonbad-e Kavus|gonbad e kavus||IR|l9|3ffy|7zfq|btpf|j64g5d
Gondar|gondar|gonder|ET|2r|3cjq|2pas|811k|j64mlv
Goodland|goodland||US|sr|3dm|8fm5|-lst2|j641rd
Goodnews Bay|goodnews bay||US|26|6e|co6i|-ymtb|j643n7
Goondiwindi|goondiwindi||AU|176|3a3|-64bw|w7x1|j64k5h
Gorakhpur|gorakhpur||IN|1sa|eg92|5qeo|hvd4|j64jst
Goranboy|goranboy||AZ|lb|5np|8pcn|a115|j63z1x
Gore|gore||NZ|1m5|7iu|-9vo3|107pg|j64n6z
Gore|gore||ET|g|77s|1qvm|7m7e|j640p5
Gorgan|gorgan||IR|l9|60u7|7w6n|bodc|j64g5j
Gorno Altaysk|gorno altaysk||RU|le|1a70|b4xp|if95|j64j85
Goroka|goroka||PG|i2|umr|-1axt|v5sv|j64lh3
Gorom Gorom|gorom gorom||BF|1b4|55v|33hw|-1st|j63ztp
Gorontalo|gorontalo||ID|lg|7u0p|48s|qdm4|j64ltd
Göteborg|goteborg|gothenburg|SE|1tz|biyt|cdlo|2klc|j64kil
Göttingen|gottingen||DE|17i|2zkr|b1j8|24jk|j64elh
Goulburn|goulburn||AU|176|g5o|-7g4o|w366|j64ibh
Goulimine|goulimine|guelmim|MA|md|2gxv|67m0|-25p8|j64kin
Goundam|goundam||ML|1pw|6iw|3ioa|-sai|j64ct1
Gouré|goure||NE|1wj|ban|2zxe|278s|j64awf
Governador Valadares|governador valadares||BR|13l|5dku|-41lo|-8zuc|j64k0d
Govorovo|govorovo||RU|1hd|q7|f1r6|r065|j64jch
Goya|goya||AR|f2|1jsg|-68ug|-cpbw|j64k37
Goyang|goyang|koyang|KR|mm|jcrc|82jn|r6o1|j64ish
Goycay|goycay|goychay|AZ|mq|r9w|8pom|a8da|j64hoh
Graaff Reinet|graaff reinet||ZA|i0|1cj4|-6x88|59co|j64kdj
Gracias|gracias||HN|y8|63p|34ix|-izih|j63tit
Grafton|grafton||AU|176|7oj|-6d9c|ws2p|j64k5d
Grahamstown|grahamstown|makhanda|ZA|i0|1yn0|-74xw|5omo|j64buj
Grajau|grajau||BR|11w|nbd|-18tw|-9w3g|j6473x
Gramsh|gramsh||AL|ig|8x0|8rbv|4bv4|j63ytd
Granada‎|granada||ES|31|8blu|7yrm|-rnu|j64j0b
Granada‎|granada||NI|lo|296r|2k2x|-if70|j64b55
Grand Bassam|grand bassam||CI|xl|1kx8|144k|-sxo|j64gkp
Grand Canyon|grand canyon|grand canyon village|US|48|172|7q78|-o19m|j648ft
Grand Forks|grand forks||US|18f|196u|a9sl|-ksph|j64ix7
Grand Island|grand island||US|16q|z83|8rrb|-l2xo|j641sz
Grand Junction|grand junction||US|ei|28eu|8dnf|-n9ks|j64ixl
Grand Prairie|grand prairie|grande prairie|CA|29|vzq|bto2|-pgo0|j64kz7
Grand Rapids|grand rapids||US|13e|bhg5|97id|-id17|j649bd
Grand Turk|grand turk|cockburn town|TC||4h5|4lmw|-f8w0|j64isz
Granja|granja||BR|c8|jyv|-o2j|-8r4g|j64gu5
Grants Pass|grants pass||US|1ai|zn1|93gr|-qflk|j648ln
Graz|graz||AT|1mc|5n42|a396|3awk|j64i2j
Great Falls|great falls||US|147|1fcu|a6ij|-nuso|j64l8x
Great Wall Station|great wall station||AQ||14|-dc2b|-cmzn|j64iul
Greeley|greeley||US|ei|2orm|8nvk|-mg6g|j641hb
Green Bay|green bay||US|1uw|498z|9jlg|-iv0g|j64izx
Green River|green river||US|1uz|8ri|8wbu|-ngmy|j648n3
Greenock|greenock||GB|pz|1ll7|bzl1|-10ng|j644bd
Greensboro|greensboro||US|18e|8c2f|7qbg|-h3qo|j64izn
Greenville|greenville||US|1ll|7isq|7gxd|-hnra|j6490p
Greenville|greenville||US|18e|1zf9|7msh|-gkyr|j64937
Greenville|greenville||US|13t|tej|75so|-jimx|j6490d
Greenville|greenville||LR|1kn|806|12nz|-1xqs|j64kjj
Grenoble|grenoble||FR|1fv|8btq|9om4|184w|j64e31
Greymouth|greymouth||NZ|1ue|7sk|-93po|10p5z|j64n4f
Griffith|griffith||AU|176|bxb|-7cl0|vauo|j64m5p
Grise Fiord|grise fiord||CA|19e|n|gdtt|-hs1o|j64kzv
Groningen|groningen||NL|lz|4n74|beng|1ers|j64bav
Groningen|groningen||SR|1iy|2hc|18qa|-bw3e|j640dn
Grootfontein|grootfontein||NA|1az|ilf|-46z6|3vse|j64mgz
Grozny|grozny|groznyy|RU|cz|4ugk|9a8z|9sm3|j64ljn
Grudziądz|grudziadz||PL|wf|271n|bgno|40oc|j64dfh
Gryazi|gryazi||RU|yv|10l1|b91w|8k4v|j64c1h
Grytviken|grytviken||GS||2r|-bmty|-7tp4|j64ist
Guadalajara|guadalajara||MX|qp|2hz74|4fi8|-m5bc|j64mv1
Guadalajara|guadalajara||ES|c2|1k7m|8pj5|-ofm|j649d3
Guaira|guaira|salto del guaira|BR|1bw|s3u|-55vo|-bmr0|j647al
Guajara-Miram|guajara miram|guajara mirim|BR|1gd|1hoy|-2bc0|-e08r|j64k05
Gualeguay|gualeguay||AR|ij|pk0|-73sc|-cpvc|j647y5
Gualeguaychú|gualeguaychu||AR|ij|1opg|-72s8|-cjjk|j64l2l
Guamúchil|guamuchil||MX|1kj|1cdj|5gj4|-n610|j64cuz
Guanajuato|guanajuato|guanajuato city|MX|m5|2eko|4i70|-lphc|j64d11
Guanambi|guanambi||BR|5z|19fh|-31so|-9664|j64gvx
Guanare|guanare||VE|1dt|390a|1xtw|-ey70|j6427z
Guangshui|guangshui||CN|ox|3bf7|6rzg|ofmo|j64eqh
Guangyuan|guangyuan||CN|1k9|9diz|6y8c|mowc|j64jkf
Guangzhou|guangzhou|dongguan guangdong|CN|m6|598i0|4ylp|oaen|j64mw3
Guanhães|guanhaes||BR|13l|ib3|-40wo|-97ek|j6475t
Guantánamo|guantanamo||CU|m8|5uht|4bfx|-g4al|j64jhn
Guapi|guapi||CO|c5|aot|jr8|-gors|j64e93
Guaranda|guaranda||EC|8w|li2|-cf8|-gxn8|j646ap
Guarapuava|guarapuava||BR|1bw|38ea|-5fu0|-b180|j647b7
Guaratinguetá|guaratingueta||BR|1nj|4d30|-4w2w|-9oos|j647zt
Guarda|guarda||PT|m9|orz|8ote|-1k18|j63vhx
Guasave|guasave|guasave city|MX|1kj|22qk|5hax|-n8yk|j64cv3
Guasdualito|guasdualito||VE|3n|nt8|1jv4|-f5u0|j64263
Guatemala City|guatemala city|ciudad de guatemala guatemala city,guatemala|GT|ma|ly4g|34tz|-jeix|j64mkd
Guaxupé|guaxupe||BR|13l|10y9|-4k9w|-a0ez|j64773
Guayaquil|guayaquil||EC|mb|1hvtc|-h45|-h4ok|j64mwd
Guayaramerín|guayaramerin||BO|ia|rs8|-2bkc|-e0pg|j647qz
Guaymas|guaymas||MX|1la|27tl|5zic|-nrms|j64lm1
Gubakha|gubakha||RU|1ci|o8w|cm8j|cccv|j64dh1
Gubkin|gubkin||RU|7o|7k|azmw|80gj|j645fz
Gueckedou|gueckedou|gueckedougou|GN|19j|4r2r|1u04|-26bq|j63yih
Guelma|guelma||DZ|mc|2nd2|7tdg|1lbc|j63zin
Gueppi|gueppi||PE|za|a|-we|-g4h8|j64k9j
Guerrero Negro|guerrero negro||MX|62|a2m|5zz4|-ogxw|j64ctv
Guide|guide||CN|kc|5wa|7q4j|lqle|j64dv5
Guider|guider||CM|181|1tbb|24mg|2zk8|j64hnb
Guiglo|guiglo||CI|14u|u72|1ejl|-1lsk|j64gkz
Guilin|guilin||CN|m7|l5ko|5f2r|nmwt|j64mhx
Güines|guines||CU|x3|1h6v|4w7d|-hkxk|j646ez
Guiyang|guiyang||CN|mg|26hm8|5p3w|mvfx|j64mvx
Gujranwala|gujranwala||PK|1ei|wffs|6w60|fwef|j64l6p
Gujrat|gujrat||PK|1ei|6gn6|6ze0|fvls|j6454z
Gulfport|gulfport||US|13t|1red|6ibg|-j3g0|j648zz
Guliston|guliston|gulistan|UZ|1kq|21pc|8ogt|eqsj|j64477
Gulkana|gulkana||US|26|3b|dchm|-v5ry|j643sv
Gulu|gulu||UG|4r|35be|lg8|6x2o|j64ldz
Gümüşhane|gumushane||TR|mr|ovu|8o80|8gns|j63tu5
Gunnedah|gunnedah||AU|176|5ik|-6n3i|w7fj|j64id5
Gunnison|gunnison||US|ei|5ng|89ew|-mx2b|j648jf
Gunsan|gunsan||KR|r1|58c0|7pmy|r5qw|j64cjv
Guntur|guntur||IN|33|bde9|3i04|h8r8|j64kq1
Gurgaon|gurgaon|gurugram|IN|ni|489o|63is|giag|j646rh
Gurupi|gurupi||BR|1q5|1dzp|-2ifg|-aijs|j64gp7
Guryevsk|guryevsk||RU|u0|twl|bmyt|if3l|j64cgv
Gusau|gusau||NG|1w6|4v1l|2lwo|1fe0|j64db1
Gusinoozyorsk|gusinoozyorsk||RU|af|ikz|azoo|mtrg|j64coj
Guwahati|guwahati|dispur,gauhati|IN|4n|l2hk|5lv8|jo34|j64lvx
Guymon|guymon||US|1a3|8mi|7v2i|-lr0r|j648rn
Gwadar|gwadar||PK|6c|141p|5dz2|dcxi|j64bdd
Gwalior|gwalior||IN|10h|kymo|5men|gr85|j64l8h
Gwanda|gwanda||ZW|12m|b5e|-4hkk|67uc|j64a5l
Gwangju|gwangju|kwangju|KR|wi|uv40|7je9|r78d|j64ljx
Gweru|gweru||ZW|13h|3xha|-462s|6e3c|j64jzt
Gyangze|gyangze|gyantse|CN|1v3|7ps|67do|j7m5|j646j1
Gyda|gyda||RU|1v9|a|f6xa|gtg5|j64j6z
Gyeongju|gyeongju||KR|fp|3bs5|7okc|rp05|j644kd
Gympie|gympie||AU|1f2|8zl|-5m2m|wq0l|j64ikf
Győr|gyor||HU|mo|2x01|a824|3s18|j64amx
Gyumri|gyumri||AM|1k2|36hp|8qqe|9ebv|j6483b
Ha Giang|ha giang||VN|p7|tlm|4w6p|mi21|j64a1z
Hà Tĩnh|ha tinh||VN|mu|3jmc|3xgq|mp4o|j649z7
Haapsalu|haapsalu||EE|105|93x|cmt3|51na|j63xbp
Haarlem|haarlem||NL|180|7i11|b864|zq4|j64bqf
Hachinohe|hachinohe||JP|3j|54g6|8oks|uc4o|j64jon
Hachiōji|hachioji||JP|1qa|cf2f|7n4x|tv1p|j646pz
Hadiboh|hadiboh|hadibu|YE|n0|8sk|2pmf|bkun|j649q3
Haeju|haeju||KP|p5|4t0n|85ii|qy0o|j64dib
Hafar al Batin|hafar al batin|hafar al batin governorate|SA|4j|5ca2|63e9|9ump|j64bd5
Hagere Hiywet|hagere hiywet|ambo|ET|g|xw0|1xak|841w|j64fy3
Hagerstown|hagerstown||US|129|1pgu|8hvk|-gnoz|j64331
Hai Duong|hai duong||VN|mt|18ry|4hl8|msge|j63tcx
Haifa|haifa|hefa|IL|n1|lo3c|719c|7hw5|j64fwp
Haikou|haikou||CN|n2|17uul|4apg|nn8g|j64jj5
Hail|hail|ha il,saudi arabia|SA|mv|899l|5wdg|8xrd|j64b87
Hailar|hailar||CN|16t|4ydf|ajmo|pnm0|j64ltn
Hailun|hailun||CN|nw|2cs9|a64o|r7ec|j64f2l
Haiphong|haiphong|hai phnng|VN|1f0|167ag|4gqo|mv4t|j64ld1
Haiya|haiya|hayya|SD|1fp|ffk|3xhe|7sqq|j649gt
Hajjah|hajjah||YE|n5|4gpr|3d2t|9cfp|j649h3
Hakha|hakha|haka|MM|df|ffk|4uro|k2cn|j6403d
Hakkâri|hakkari||TR|n6|1nyb|81xc|9di8|j644nl
Hakodate|hakodate||JP|of|6hs8|8yhq|u5yg|j64lu5
Halachó|halacho||MX|1vq|72l|4e0w|-jb28|j6460f
Haldia|haldia||IN|1ud|4awq|4py9|ivgn|j64gcj
Half Way Tree|half way tree|halfway tree|JM|1h2|22ge|3v59|-gglc|j63x33
Halifax|halifax||CA|193|7p3b|9kis|-dmqo|j64mot
Hall Beach|hall beach|sanirajak|CA|19e|i6|eqm3|-hetl|j647j7
Halley Station|halley station|halley research station|AQ||1y|-gb4r|-5o9y|j64ivv
Halls Creek|halls creek||AU|1uo|xl|-3wy3|rdur|j64k45
Halmstad|halmstad||SE|n7|16y1|c5a6|2r70|j649m3
Hamadan|hamadan||IR|n8|bbls|7ghk|aece|j64lyt
Hamah|hamah|hama|SY|n9|9vei|7j7z|7ves|j649fx
Hamamatsu|hamamatsu||JP|1k4|kxvj|7fvx|tir3|j64f4n
Hamar|hamar||NO|nv|mqv|d1ag|2deq|j63vq7
Hamburg|hamburg||DE|na|11npk|bh7k|2559|j64mwp
Hämeenlinna|hameenlinna||FI|1p1|10gt|d2nm|58ts|j63y4z
Hamhung|hamhung||KP|nc|gkg8|8jyo|rc4r|j64jf3
Hami|hami|yizhou|CN|1v2|cfj4|96ge|k1ke|j64mjl
Hamilton|hamilton||CA|1aa|fgd9|99pw|-h3z0|j64k23
Hamilton|hamilton||NZ|1u1|36co|-83hz|11kjk|j64n63
Hamilton|hamilton||BM||14dc|6x6m|-dvvj|j64ms1
Hamilton|hamilton||AU|1t8|6ud|-834w|ufuy|j64ign
Hammerfest|hammerfest||NO|ji|7ps|f585|52s0|j64lgb
Hampton|hampton||US|1tg|7uzy|7xq4|-gd4c|j642xt
Hancheng|hancheng||CN|1jm|4ref|7low|no30|j64epl
Hancock|hancock||US|13e|cmb|a3mx|-izhs|j649c7
Handan|handan||CN|nu|yyhk|7u9n|ojbg|j64lsl
Hanggin Houqi|hanggin houqi|hanggin rear banner|CN|16t|utu|8rgv|myp4|j646nx
Hangu|hangu|lunan|CN|1pr|74s9|8eps|p8ru|j646ld
Hangzhou|hangzhou||CN|1wg|1sg7s|6hfb|pr81|j64mxn
Hania|hania|chania|GR|w1|1oqw|7m0i|55b0|j646yv
Hanoi|hanoi|h|VN|1pp|2lu34|4ib5|moq9|j64mtv
Hanover|hanover|hannover|DE|17i|fhh6|b82e|22z3|j64eld
Hanzhong|hanzhong||CN|1jm|34n6|73ms|mxuk|j64jj7
Haora|haora|howrah|IN|1ud|2vrty|4u8c|ixk3|j64gcb
Happy Valley - Goose Bay|happy valley goose bay||CA|179|5uc|bf9k|-cxa0|j647od
Hapur|hapur||IN|1sa|57fs|65sd|go0s|j6472z
Harar|harar|harar jugol|ET|g|3r0y|1zww|918c|j64kt5
Harare|harare||ZW|ne|xoyo|-3tgu|6nj0|j64mb1
Harbin|harbin|haerbin|CN|nw|25lzc|9t0v|r580|j64mxx
Hardin|hardin||US|147|3fk|9sva|-n2cd|j6416t
Hargeisa|hargeisa|hargeysa|||a8qc|21rk|9g0d|j64ms5
Harlingen|harlingen||US|1ph|2d4z|5m54|-kxs6|j641zx
Härnösand|harnosand||SE|1tx|d4o|dfac|3udo|j63unh
Harper|harper||LR|129|p79|xre|-1njm|j64b73
Harrisburg|harrisburg||US|1cd|bc3g|8mr4|-gh8v|j64jwt
Harrisonburg|harrisonburg||US|1tg|wtm|88oe|-gwk4|j642x1
Harstad|harstad||NO|1r1|ezt|eqrr|3jfo|j64baz
Hartford|hartford||US|er|jkh4|8ybc|-fktf|j64iz3
Hasselt|hasselt||BE|yp|1heu|ax8o|16bc|j63yz7
Hassi Messaoud|hassi messaoud||DZ|1b2|dzg|6sm7|1apt|j64hzx
Hastings|hastings||NZ|l0|1f04|-8hum|11whc|j64n5d
Hat Yai|hat yai||TH|1l8|6tc2|1hzg|lj8q|j64k8n
Hathras|hathras||IN|1sa|2pwi|5wyo|gq8k|j64723
Hato Mayor|hato mayor|hato mayor del rey|DO|nm|rrz|40s8|-eue2|j63xsh
Hattiesburg|hattiesburg||US|13t|19fe|6pq1|-j4yu|j64903
Haugesund|haugesund||NO|1ga|v41|cqfb|14pz|j64j47
Havana|havana|la habana|CU|e5|1algw|4yi3|-hnjh|j64mwj
Havre|havre||US|147|8lu|aeks|-nia1|j64jtd
Hawalli|hawalli||KW|nt|3ipg|6ac5|aadc|j63xc7
Hawera|hawera||NZ|1on|8kc|-8heb|11cqk|j64n6t
Hay River|hay river||CA|18z|30c|d1is|-osqw|j647jj
Hays|hays||US|sr|gia|8bzu|-ladi|j641r1
Hearst|hearst||CA|1aa|3w3|anhp|-hxkq|j64h3b
Hebi|hebi||CN|nx|58s6|7pe8|ohbs|j64eu1
Hechi|hechi||CN|m7|2a38w|5ajt|n5z2|j64dvt
Hefei|hefei||CN|36|17m7s|6trs|p4x9|j64lpd
Hegang|hegang||CN|nw|fxjf|a5qo|rxxw|j64jnx
Heidelberg|heidelberg||DE|5r|955q|albs|1v4o|j646g3
Heihe|heihe||CN|nw|2cfn|arqc|rbdo|j64jnp
Helena|helena||US|147|tvp|9zif|-o0gx|j64m87
Helong|helong||CN|r8|1u64|9478|rnek|j64ezf
Helsingborg|helsingborg||SE|1kw|1yg8|c0hl|2pzs|j64aup
Helsinki|helsinki||FI|1m1|nwc8|cwbz|5cdm|j64myj
Hengshui|hengshui||CN|nu|9s4k|831s|osqw|j646kj
Hengyang|hengyang||CN|p0|lry8|5rf8|o4qh|j64ls7
Herat|herat||AF|ob|ab5d|7cw4|dbpg|j64m3z
Heredia|heredia||CR|nz|gxn|253k|-i12o|j640jn
Hereford|hereford||US|1ph|c3f|7gor|-ly42|j6423v
Herisau|herisau||CH|3k|bwu|a5m1|1zmp|j63ui3
Hermanus|hermanus||ZA|1up|jep|-7di8|44dn|j64biz
Hermosillo|hermosillo||MX|1la|crqb|68j1|-ns4l|j64llz
Hervey Bay|hervey bay||AU|1f2|jdm|-5f4n|wrbt|j64im5
Hetauda|hetauda||NP|16e|4z9q|5vjr|i84e|j6457n
Heyuan|heyuan||CN|m6|73dd|533s|okvk|j64dy3
Heze|heze||CN|1js|soeo|7jun|oqsx|j64jm7
Hickory|hickory||US|18e|1x12|7npz|-hfmu|j6493d
Hidalgo del Parral|hidalgo del parral||MX|db|27rm|5rti|-mnbu|j645rl
Higuey|higuey|salvaleon de higuey|DO|wz|2nij|3zn4|-eq5k|j63xvv
Hilf|hilf|dawwah|OM|4j|6k4|4fdu|cmao|j6488n
Hillerød|hillerod||DK|oo|luh|bzl1|2n1b|j63ybt
Hilo|hilo||US|ns|14fb|4808|-x8ok|j64l95
Hinche|hinche||HT|ce|ece|43pi|-ffl4|j63tkz
Hindupur|hindupur||IN|33|3lvc|2ybw|glx0|j64fhv
Hinthada|hinthada||MM|5d|3vg8|3s6b|kgmv|j64iqz
Hinton|hinton||CA|29|7x5|bg1c|-p7a1|j647hz
Hios|hios|chios|GR|1tq|kqz|881t|5lny|j64fuv
Hirosaki|hirosaki||JP|3j|3r0c|8p1g|u3vg|j64jol
Hiroshima|hiroshima||JP|oc|17txk|7dcq|sdx6|j64mxp
Hisar|hisar||IN|ni|boe5|692s|g8aq|j646rv
Hlatikulu|hlatikulu||SZ|1k3|24c|-5sc0|6qev|j63vah
Hlotse|hlotse||LS|yb|10sb|-66to|60hc|j63wtl
Ho|ho||GH|1tn|1zsk|1exg|3mk|j64ffj
Ho Chi Minh City|ho chi minh city|th nh pho ho chy minh|VN|ms|35wb4|2b70|mv8z|j64mtx
Hoa Binh|hoa binh||VN|p9|297w|4gll|mksn|j649yh
Hobart|hobart||AU|1oy|1qee|-96ms|vkja|j64mrn
Hobbs|hobbs||US|175|m6a|70eu|-m3u6|j648kn
Hodrogo|hodrogo||MN|hq|a|ahts|kqs9|j64djf
Hof|hof||DE|7i|17bt|as8y|2jy7|j64emv
Höfn|hofn||IS|1nb|1b3|drxf|-39e3|j64j1t
Hofuf|hofuf|al hufuf|SA|4j|dnt9|5flb|amls|j64j4n
Hohenau|hohenau||PY|qf|43e|-5sy3|-by64|j64b51
Hohhot|hohhot|huhot|CN|16t|10zsg|8qzf|nxk5|j64lth
Hokitika|hokitika||NZ|1ue|2di|-95j4|10nis|j64n53
Holguín|holguin||CU|og|6u7y|4h60|-gcg7|j64jhp
Holman|holman|ulukhaktok|CA|18z|dw|f5s6|-p8kc|j64k1t
Homer|homer||US|26|528|cs7h|-whcr|j649kx
Homestead|homestead||US|jl|1ubz|5gij|-h8yy|j642cz
Homs|homs|hims|SY|oh|ljgo|7fzr|7vbh|j64k7z
Homyel|homyel|gomel|BY|oi|ab3r|b8jw|6n74|j64k3v
Hon Quan|hon quan||VN|5m|v2v|2hw8|muj4|j649zt
Honda|honda||CO|1qd|rd9|141r|-g0rw|j64e8p
Hong Gai|hong gai|ha long,hon gai|VN|1f0|3pf7|4hqc|mye0|j649wd
Hong Kong|hong kong||HK||4ag6o|4s4d|oh1j|j64n4d
Honiara|honiara||SB|m0|1mw8|-20to|ya6i|j64mdl
Honolulu|honolulu||US|ns|guhc|4kf4|-xu1z|j64mt1
Hoonah|hoonah||US|26|a1|cgf6|-t11u|j649hv
Hooper Bay|hooper bay||US|26|tz|d6rz|-zlly|j64jxp
Hopedale|hopedale||CA|179|ca|bvus|-cwmv|j647o7
Hopkinsville|hopkinsville||US|u3|rh0|7wgf|-ir2e|j642qt
Horlivka|horlivka||UA|h6|8i8l|acok|85mr|j6440v
Horqueta|horqueta||PY|eq|ch7|-5038|-c878|j64b3v
Horsham|horsham||AU|1t8|9we|-7v94|uh58|j64ih5
Horta|horta||PT|5f|53n|89c3|-650w|j64b5j
Hosaina|hosaina|hosaena|ET|1m3|1wwk|1m9c|841w|j64fxp
Hosapete|hosapete|hospet|IN|t6|64on|39wk|gdba|j64fkd
Hoshiarpur|hoshiarpur||IN|1ei|3e0u|6r7k|ga9k|j6471x
Hoskins|hoskins||PG|1uj|o7|-168q|w8kk|j64bqb
Hot Springs|hot springs||US|49|y3a|7e8g|-jy0m|j648nn
Hotan|hotan||CN|1v2|8ri6|7y9h|h4px|j64mjn
Houlton|houlton||US|10z|567|9vwn|-ejgd|j643bf
Houma|houma||CN|1ju|270g|7mug|nu3o|j64ls3
Houma|houma||US|zl|1du8|6cd3|-jfzv|j648sf
Houston|houston||US|1ph|2nkl4|6e3v|-kfnv|j64n0d
Hradec Králové|hradec kralove||CZ|w3|21gb|are4|3e08|j640mj
Hrodna|hrodna|grodno|BY|op|6svp|bi6j|53wl|j64i41
Hsinchu|hsinchu||TW|or|g2pc|5bhk|pxgn|j64iwv
Hua Hin|hua hin||TH|1dy|12xk|2ozl|lf6b|j649vv
Huacho|huacho||PE|yn|1q3e|-2dq4|-gmx3|j644wj
Huaibei|huaibei||CN|36|jkh4|79z7|p0u1|j64jgp
Huainan|huainan||CN|36|v3lk|6zsf|p2lw|j64mhz
Huaiyin|huaiyin|huai an|CN|r3|r3b4|774b|pifc|j64lsx
Huajuapan de León|huajuapan de leon||MX|19l|10x0|3tfc|-kyjw|j64d0b
Hualien|hualien|hualien city|TW|ou|7if8|5525|q29s|j64l67
Huamachuco|huamachuco||PE|x4|nsj|-1o9g|-gq8j|j644uj
Huambo|huambo||AO|ov|nkrk|-2qd4|3dl9|j64mqj
Huancavelica|huancavelica||PE|ow|y90|-2qos|-g2mk|j64k9n
Huancayo|huancayo||PE|ri|8ugt|-2l7k|-g48w|j64lf5
Huanghua|huanghua||CN|nu|2klc|882g|p5bo|j64et7
Huangshi|huangshi||CN|ox|eqxm|6h6g|oo48|j64jjv
Huangyan|huangyan||CN|1wg|49bt|652c|pzkk|j646lv
Huanren|huanren||CN|yg|2hzh|8uc3|qv6c|j64eut
Huanta|huanta||PE|5b|edf|-2rx4|-fwx0|j64b27
Huánuco|huanuco||PE|p2|3e0x|-24jk|-gc9s|j64k9d
Huaraz|huaraz||PE|30|1v2u|-21j8|-gm84|j64k97
Huarmey|huarmey||PE|30|ch8|-25p4|-gr34|j64b07
Huasco|huasco||CL|4v|1z2|-63o8|-f9jc|j64frd
Huatabampo|huatabampo|huatabampobambo|MX|1la|nh6|5r0w|-nhws|j64cwd
Huaura|huaura||PE|yn|v68|-2dc8|-gmrk|j644wb
Hubballi|hubballi|hubli|IN|t6|j2q8|3aj7|g3nj|j64lvh
Hudson Bay|hudson bay||CA|1j3|1nx|bbso|-lxzt|j64gzb
Hudur|hudur|xuddur|SO|65|19j|wa1|9eh7|j63w13
Hue|hue||VN|1pi|kd0w|3j30|n23c|j64jz1
Huehuetenango|huehuetenango||GT|oy|1uco|3a7o|-jlsc|j64fcb
Huelva|huelva||ES|31|338u|7zfc|-1hgz|j649cp
Hughenden|hughenden||AU|1f2|bp|-4gvo|uwnk|j64k67
Hughes|hughes||US|26|26|e5n0|-x28m|j649jx
Huinan|huinan|huinan county|CN|r8|1f63|94vp|r28m|j64eyt
Huize|huize||CN|1vt|3zm|5nbk|m5yv|j64esp
Huizhou|huizhou||CN|m6|675d|4y34|oips|j6469v
Hulan Ergi|hulan ergi|fularji|CN|nw|67rj|a49w|qhs4|j646of
Hulin|hulin||CN|nw|wu7|9t5m|si6a|j64f3t
Humahuaca|humahuaca||AR|rg|8rt|-4z0g|-e08r|j647vx
Hun|hun||LY|1m|eke|68nz|3exx|j64ks5
Huntington|huntington||US|1ul|1tw4|88g4|-ho5h|j6496b
Huntsville|huntsville||US|23|4k59|7fwg|-ikac|j64jv3
Huntsville|huntsville||US|1ph|rgm|6l2e|-kh9u|j648th
Hurdiyo|hurdiyo||SO|6u|4w|29ng|aygx|j64cil
Hurghada|hurghada|al ghurdaqah|EG|15|3das|5u3w|7918|j64knt
Hutchinson|hutchinson||US|sr|ybh|85pr|-kzkz|j641p7
Huzhou|huzhou||CN|1wg|qdug|6m7n|pqol|j64jmt
Hwange|hwange||ZW|12l|q85|-3xqs|5oh4|j64jzp
Hydaburg|hydaburg||US|26|am|bu18|-sgp2|j643kx
Hyderabad|hyderabad||IN|1p9|3snr4|3q9v|gtjg|j64my7
Hyderabad|hyderabad||PK|1kk|v9rs|5fuj|enki|j64md5
Hyeson|hyeson|hyesan|KP|1gm|4vid|8vdz|rh53|j64djd
I-n-Amenas|i n amenas|in amenas|DZ|pm|60|60fr|21os|j64hzf
I-n-Salah|i n salah|in salah|DZ|1ob|11zb|5u06|j16|j64l47
Iași|iasi||RO|pc|6zh6|a3yb|5wrp|j64lej
Ibadan|ibadan||NG|1bd|1kbs0|1kyk|ub4|j64lmp
Ibagué|ibague||CO|1qd|91dh|y91|-g4hu|j64jhv
Ibarra|ibarra||EC|pq|3585|2s4|-gqus|j64e9v
Ibb|ibb||YE|pe|5179|2zu7|9gtp|j643jn
Ibri|ibri||OM|1a|26fc|4z7i|c436|j64ciz
Ica|ica||PE|pf|5zlo|-30js|-g8av|j64mcb
Icel|icel|mersin|TR|13a|d82m|7vy8|7f4o|j644h3
Icó|ico||BR|c8|lur|-1dds|-8bro|j64kxp
Idah|idah||NG|ve|1lxr|1iv4|1g07|j64daf
Idaho Falls|idaho falls||US|ph|1p9j|9be3|-o0gd|j64jth
Idlib|idlib||SY|pi|2rew|7p8h|7unh|j643ht
Ifakara|ifakara||TZ|14l|127s|-1qq8|7v0w|j64aqx
Ife|ife||NG|1ax|ac71|1lpw|z6o|j64d8v
Iganga|iganga||UG|pj|yqo|4p8|768u|j63twx
Igarka|igarka||RU|w0|5ri|egkv|ik2x|j64cnt
Igloolik|igloolik||CA|19e|18s|eudx|-hj4g|j64m25
Igrim|igrim||RU|ue|7d5|djlp|dt2a|j64j7n
Iguala|iguala||MX|me|2ei2|3xqs|-lc20|j645xt
Iguape|iguape||BR|1nj|ico|-5aqo|-a71v|j64l2t
Iguatu|iguatu||BR|c8|1ib0|-1d2o|-8f8o|j647dv
Ihosy|ihosy||MG|jf|d3y|-4su4|9vu7|j64bo7
Ijebu Ode|ijebu ode||NG|19v|4hef|1gmk|u8w|j64d83
Ijevan|ijevan||AM|1p2|bdd|8rec|9odg|j63yzp
Ijuí|ijui||BR|1g0|1ixu|-631z|-bk1r|j64gsp
Ikare|ikare||NG|1a9|nkpn|1m3s|18g0|j64d8d
Ikela|ikela||CD|f7|83|-94l|4ziy|j64ecz
Iksan|iksan||KR|r1|62r1|7pbm|r7im|j644k1
Il'pyrskiy|il pyrskiy|ilpyrskoye|RU|sf|a|cupm|z6rc|j64dlx
Ilam|ilam||IR|pk|39z2|77hs|9y98|j64g6j
Ilam|ilam||NP|130|dhv|5rmg|iufw|j63vw3
Ilave|ilave||PE|bc|cdd|-3g2k|-exks|j64azz
Ilebo|ilebo||CD|ta|2amt|-xbw|4f10|j64f8d
Ilhéus|ilheus||BR|5z|4xy6|-361k|-8db8|j64ky1
Iligan|iligan||PH|xt|9yhj|1r1s|qmga|j64cl1
Illapel|illapel||CL|ew|kbo|-6s20|-f95g|j64frz
Illichivsk|illichivsk|chornomorsk|UA|19q|15qu|9x94|6kmi|j643zd
Illizi|illizi||DZ|pm|651|5oci|1tbu|j64l43
Ilo|ilo||PE|14d|159g|-3s40|-fago|j64k93
Iloilo|iloilo|iloilo city|PH|pp|8b4x|2alm|q9ka|j64mf7
Ilorin|ilorin||NG|wj|giwo|1tiw|z3d|j64khh
Ilulissat|ilulissat||GL|1eq|3el|eu2v|-ayag|j64jr1
Imbituba|imbituba||BR|1im|xiy|-61tk|-afgo|j64gtx
Imperatriz|imperatriz||BR|11w|4oai|-16lc|-a6fo|j64kwd
Imphal|imphal||IN|11k|5ogq|5bcw|k4x8|j64jpp
In Amguel|in amguel|i n amguel|DZ|1ob|2c6|52tn|13un|j64hzj
Incheon|incheon|inch on|KR|pt|1inlc|816l|r55v|j64l6t
Independence|independence||US|13u|369y|8dmn|-k8ih|j641rp
Indianapolis|indianapolis||US|pv|us0w|8iq7|-igwo|j64lbd
Indiga|indiga||RU|16v|a|eiaq|ai7q|j64j6p
Indore|indore||IN|10h|17f9s|4vaa|g9d3|j64lzl
Indramayu|indramayu||ID|qu|2n3z|-1cvw|n7sm|j64dyv
Ingeniero Guillermo N. Juarez|ingeniero guillermo n juarez|asentamiento|AR|jm|4z9|-54ew|-d98k|j647xb
Ingeniero Jacobacci|ingeniero jacobacci||AR|1fc|4ev|-8uo8|-ewwp|j647uf
Ingham|ingham||AU|1f2|4q7|-3zwg|vbtu|j64ikj
Ingolstadt|ingolstadt||DE|7i|3i0t|agbc|2gck|j64en3
Inhambane|inhambane||MZ|px|2hc0|-5438|7kom|j64kdf
Inhumas|inhumas||BR|l8|xzu|-3i8g|-aly0|j647s3
Inírida|inirida|obando puerto inirida|CO|m2|6zt|tqk|-ejyt|j64ebl
Innisfail|innisfail||AU|1f2|7tr|-3r9t|vaub|j64k71
Innsbruck|innsbruck||AT|1q0|3bri|a4tg|2g1g|j64i35
Inongo|inongo||CD|6i|uy9|-eyw|3x1s|j64kop
Inowrocław|inowroclaw||PL|wf|1oyn|bb93|3wtg|j6461l
Inta|inta||RU|vh|hop|e5jq|cw96|j64kf7
Inukjuak|inukjuak|inoucdjouac port harrison|CA|1fa|18d|cj5o|-gqwg|j64l15
Inuvik|inuvik||CA|18z|2by|ene4|-snmw|j64l07
Invercargill|invercargill||NZ|1m5|11yo|-9y3i|10342|j64n5x
Inverell|inverell||AU|176|6lt|-6dok|wdzq|j64idj
Inverness|inverness||GB|o7|yue|cbf3|-wnx|j64ait
Ioanina|ioanina|ioannina|GR|q2|1ulc|8i2v|4gvx|j64ful
Iowa City|iowa city||US|q1|240k|8xgj|-jm90|j641np
Ipatinga|ipatinga||BR|13l|8qqe|-46b0|-9434|j64gpv
Ipiales|ipiales||CO|16f|2cky|6eo|-gn5g|j64e9h
Ipoh|ipoh||MY|1cf|efja|zhs|lntm|j64kkb
Iporá|ipora||BR|l8|lsu|-3ixg|-ayis|j647rz
Ipswich|ipswich||GB|1mr|32xj|b5rz|910|j64ah1
Ipú|ipu||BR|c8|kl2|-xbw|-8q75|j64gv5
Iqaluit|iqaluit||CA|19e|4q4|dnwh|-eoju|j64m1t
Iquique|iquique||CL|1or|4vjf|-4c90|-f14k|j64mkv
Iquitos|iquitos||PE|za|9tyh|-sxo|-fp78|j64lf3
Iraklio|iraklio|heraklion,iraklion|GR|w1|2xtu|7kki|5dwp|j64ksp
Irapuato|irapuato||MX|m5|7a02|4fho|-lr6g|j645x5
Irati|irati||BR|1bw|zd2|-5gj0|-auw8|j647bp
Irbid|irbid||JO|q3|dxjk|6z5o|7omc|j64685
Irbil|irbil|arbil,erbil|IQ|42|jui8|7r6a|9fk3|j64jr7
Irecê|irece||BR|5z|1d3e|-2f6w|-8z2k|j64ky7
Iringa|iringa||TZ|q5|2ea4|-1ny8|7ndw|j64arx
Irkutsk|irkutsk||RU|q6|ckp3|b7pc|mccy|j64mff
Iron Mountain|iron mountain||US|13e|chj|9tkh|-ivi9|j643df
Ironwood|ironwood||US|13e|5g8|9yge|-jboa|j643dv
Irvine|irvine||US|bb|1sipk|77vo|-p96j|j648hn
Ísafjörður|isafjordur||IS|1t2|1ye|e5wh|-4ymk|j64k2f
Iseyin|iseyin||NG|1bd|23o7|1phw|rp8|j6460p
Isfahan|isfahan|esfahan|IR|iq|yw68|70bw|b2wl|j64mm3
Ishim|ishim||RU|1rf|1gaa|c19a|evvm|j64cff
Isikul|isikul|isilkul|RU|1a8|gb4|brtz|f9wq|j64cfb
Isiro|isiro||CD|1an|3dak|lao|5x48|j64knz
Iskandar|iskandar||UZ|1ox|46y9|8wlv|exnr|j6447l
İskenderun|iskenderun||TR|nl|6dw7|7u98|7r38|j64aft
Iskitim|iskitim||RU|195|1bpf|bpot|hun5|j645lt
Isla Mujeres|isla mujeres||MX|1f8|9mz|4jn8|-il2j|j64d31
Islamabad|islamabad||PK|j4|gpuo|781n|fojj|j64md1
Island Lake|island lake||CA|11m|a|bkeq|-kb82|j647h7
Ismaïlia|ismailia||EG|1h|e29z|6k1b|6wx4|j64eft
Isna|isna|esna|EG|1eu|255s|5f54|6z5n|j64ehp
Isparta|isparta||TR|qb|3oz2|83fo|6jkk|j644fh
Istanbul|istanbul||TR|qc|5zn48|8t6l|67tt|j64n2z
Itá|ita||PY|4q|vpe|-5gu0|-calc|j64b4b
Itaberaba|itaberaba||BR|5z|10hx|-2olo|-8myg|j64gx1
Itaberaí|itaberai||BR|l8|h2p|-3fm0|-aoc4|j647s7
Itabuna|itabuna||BR|5z|4r8y|-3648|-8f34|j64gvn
Itacoatiara|itacoatiara||BR|2q|13qt|-o88|-cixc|j64kw3
Itaituba|itaituba||BR|1bz|1z84|-wuy|-bziq|j64kwn
Itajaí|itajai||BR|1im|70eu|-5rk4|-afm8|j64gtv
Itamaraju|itamaraju||BR|5z|10r0|-3nh8|-8h0j|j64gvt
Itambé|itambe||BR|5z|i6e|-39l8|-8pi4|j64gwt
Itanagar|itanagar||IN|4e|yp7|5t3w|k2cm|j64gg7
Itanhaem|itanhaem||BR|1nj|1xqp|-56ko|-a140|j647z5
Itapecuru Mirim|itapecuru mirim||BR|11w|qyn|-q8g|-9ia8|j64745
Itapetinga|itapetinga||BR|5z|1a2x|-39o4|-8mkk|j647f5
Itapetininga|itapetininga||BR|1nj|2per|-520s|-aaog|j64821
Itapeva|itapeva||BR|1nj|1ckt|-5510|-ah5s|j64hjp
Itapipoca|itapipoca||BR|c8|171k|-r03|-8heg|j64guf
Itaúna|itauna||BR|13l|1nq0|-4as8|-9jwk|j6476b
Ithaca|ithaca||US|178|1a8q|93h2|-ge95|j64jwp
Itigi|itigi||TZ|1km|f7j|-17z8|7e1s|j64asn
Ittoqqortoormiit|ittoqqortoormiit||GL|vk|d1|f3uq|-4phv|j64jql
Itu|itu||BR|1nj|6v1m|-4zh4|-a4yw|j6481x
Ituiutaba|ituiutaba||BR|13l|1tup|-42dg|-almw|j64783
Itumbiara|itumbiara||BR|l8|1pem|-3xz0|-ajpg|j64hd7
Ituni|ituni||GY|1ry|2s|15wc|-chgk|j6449h
Itupiranga|itupiranga||BR|1bz|gfp|-13i8|-akeg|j64751
Iturama|iturama||BR|13l|mzx|-488k|-arcg|j6477z
Ivanhoe|ivanhoe||AU|176|7d|-71us|uxfc|j64i9n
Ivano-Frankivsk|ivano frankivsk|ivano frankivs k|UA|qg|5653|ahl0|5anq|j649np
Ivanovo|ivanovo||RU|qh|90pz|c7w4|8sfo|j64kef
Ivdel|ivdel||RU|1nc|eyb|d0bc|cy5h|j64cat
Ivugivik|ivugivik|ivujivik|CA|1fa|4c|ddly|-gp2w|j64l13
Iwaki|iwaki||JP|jx|7np9|7xx5|u744|j64f5x
Iwo|iwo||NG|1ax|5d8r|1mvg|w94|j6460l
Izamal|izamal||MX|1vq|bje|4hi0|-j2vt|j64d3j
Izaz|izaz|azaz|SY|2a|oby|7ubk|7xu1|j643gz
Izhevsk|izhevsk|izevsk|RU|1rm|diwu|c6no|beq4|j64kfh
İzmir|izmir||TR|qk|1jg54|88l9|5thm|j64ldn
İzmit|izmit|kocaeli|TR|vc|9zyg|8qmo|6ey2|j64aej
Jabal Ali|jabal ali|jebel ali,mina jabel ali|AE|he|1pq8|5cpu|bsgr|j6488j
Jabalpur|jabalpur||IN|10h|rjig|4yu2|h4x7|j64lzj
Jaboatao|jaboatao|jaboatao dos guararapes|BR|1cj|f259|-1qks|-7i7s|j6482b
Jaboticabal|jaboticabal||BR|1nj|1hjm|-4jys|-acx0|j647zb
Jacareacanga|jacareacanga||BR|1bs|ofh|-1ccq|-cctw|j64kwj
Jacarezinho|jacarezinho||BR|1bw|r2q|-4ypb|-apnc|j647c1
Jackson|jackson||US|13t|5dli|6x7w|-jbve|j64m9b
Jackson|jackson||US|1pd|1crg|7mt1|-j1aj|j6494b
Jacksonville|jacksonville|jacksonville florida|US|jl|l6cg|6i1k|-hi6n|j64lb5
Jacksonville|jacksonville||US|18e|1nmw|7g5z|-glgi|j64933
Jacmel|jacmel||HT|1mo|pwb|3wpa|-fjp6|j63tln
Jacundá|jacunda||BR|1bs|13n3|-y97|-aiz9|j64go3
Jaén|jaen||ES|31|2htc|83fs|-tbk|j649cl
Jaén|jaen||PE|b7|14i5|-1820|-gw3o|j64b0h
Jaffna|jaffna||LK|ql|5cwg|22ni|h5bm|j64kgd
Jaguaquara|jaguaquara||BR|5z|w0q|-2wec|-8kes|j647f1
Jaipur|jaipur||IN|1fe|1qirs|5rqn|g8xs|j64myn
Jakarta|jakarta||ID|qm|5fkw8|-1bml|mwab|j64n3j
Jalal Abad|jalal abad||KG|qn|5c1v|8rx1|fnah|j64bez
Jalalabad|jalalabad|jalabad|AF|16a|cteb|7dr3|f3hl|j64hq1
Jalapa|jalapa||GT|qo|zd6|34wq|-jacy|j63xmp
Jalingo|jalingo||NG|1om|2iv1|1woc|2fnk|j64d7l
Jaltipan|jaltipan|jaltipan de morelos|MX|1sy|1fp2|3ufc|-kb0o|j645yp
Jamaame|jamaame|jamame|SO|rf|3yye|k2|95v6|j64kgz
Jamalpur|jamalpur||BD|ge|3ljw|5c4s|ja24|j64hrb
Jambi|jambi||ID|qq|9soy|-c9o|m7gk|j64kph
Jamestown|jamestown||US|178|zb0|90tq|-gzdv|j6497p
Jamestown|jamestown||US|18f|bmx|a1xg|-l5li|j648cp
Jammu|jammu||IN|qr|gyc8|70f5|g1i8|j64l7n
Jamshedpur|jamshedpur||IN|r2|rv34|4vuf|ih38|j64m83
Janaúba|janauba||BR|13l|17ng|-3dws|-9a6k|j64gr3
Janesville|janesville||US|1uw|1hge|95ca|-j2w8|j64301
Januária|januaria||BR|13l|quz|-3bg0|-9id0|j64kx5
Jaqué|jaque||PA|fz|11p|1m0m|-gr4s|j64587
Jaraguá do Sul|jaragua do sul||BR|1im|2seq|-5obk|-aiuw|j647cn
Jardim|jardim||BR|12r|ick|-4lqn|-c198|j6475j
Jashore|jashore||BD|um|589f|4ys8|j49s|j64i4f
Jasper|jasper||CA|29|30j|bc1t|-pb4y|j64kyz
Jataí|jatai||BR|l8|1n2b|-3tyk|-b3b0|j64hdd
Jaú|jau||BR|1nj|2jza|-4rzk|-aero|j64hjj
Jauja|jauja||PE|ri|g8x|-2j1o|-g6k8|j64b2z
Jawhar|jawhar|jowhar|SO|1jn|2dvw|lcm|9r7i|j64cid
Jayapura|jayapura||ID|1br|3mnx|-jjm|u5nc|j64lo5
Jeddah|jeddah|jiddah|SA|111|1sk2o|4m1g|8elp|j64mul
Jefferson City|jefferson city||US|13u|16jn|89nq|-jr7p|j64iyd
Jeju|jeju|cheju|KR|qy|8r3g|76kd|r48z|j64ail
Jelgava|jelgava||LV|qz|1fuv|c54v|52yw|j64bct
Jember|jember||ID|qw|6ee1|-1r27|od7t|j64kmf
Jena|jena||DE|1pq|28so|awzc|2hco|j64elp
Jendouba|jendouba||TN|r0|13o0|7tmw|1vik|j63t63
Jeonju|jeonju|chonju|KR|r1|f8xs|7oh6|r90s|j64cjp
Jequié|jequie||BR|5z|2wly|-2yv8|-8l9c|j64kxz
Jérémie|jeremie||HT|ls|nut|3zs3|-fvwg|j63tk3
Jhang|jhang||PK|1ei|7ba2|6pd0|fi2a|j64be3
Jhansi|jhansi||IN|1sa|hpq6|5gea|gu5j|j64gbh
Ji-Paraná|ji parana||BR|1gc|1e60|-2bl9|-da52|j64mnd
Jiamusi|jiamusi||CN|nw|lv1c|a1cw|rxrt|j64ltp
Jian|jian|ji an|CN|r4|b5fc|5tc8|oncg|j64ewh
Jiangmen|jiangmen||CN|m6|betf|4u8c|o8j4|j64dyl
Jianmen|jianmen|jingmen city,tianmen|CN|ox|10lwg|6kig|o94t|j64jjl
Jiaohe|jiaohe||CN|r8|2mx6|9dbf|ralw|j64ez1
Jiaojing|jiaojing|jiaojiang|CN|1wg|a3t8|65as|q144|j64exd
Jiaozuo|jiaozuo||CN|nx|id9k|7k08|o9lh|j64jl5
Jiaxing|jiaxing||CN|1wg|l6cg|6lfw|pvp4|j64jmp
Jiayuguan|jiayuguan|jiayuguan city|CN|kc|36ev|8j94|l2hk|j64mht
Jieshou|jieshou||CN|36|31k9|74k8|oq1o|j64dxd
Jiexiu|jiexiu||CN|1ju|1nju|7xsw|nzfc|j64eq7
Jihlava|jihlava||CZ|vy|15lt|al6c|3c8p|j64enh
Jijel|jijel||DZ|r7|3674|7w4c|18ho|j63zg1
Jijiga|jijiga||ET|1l5|17ud|205c|9664|j64fyz
Jilin|jilin|jilin city|CN|r8|1fcrk|9ed3|r4g9|j64l7j
Jima|jima|jimma|ET|g|2r02|1n9c|7w6k|j64ktb
Jinan|jinan|jinan shandong|CN|1js|1nyy8|7v01|p2q3|j64mxf
Jinchang|jinchang||CN|kc|33e3|8919|lwdn|j64dv1
Jincheng|jincheng||CN|1ju|gaf4|7lx8|o6lo|j64eq3
Jingdezhen|jingdezhen||CN|r4|9suq|69uo|p460|j64ewp
Jingmen|jingmen|jingmen city|CN|ox|8kn4|6nfk|o0yw|j64eql
Jingzhou|jingzhou|shashi|CN|ox|b58g|6hy8|o1z0|j646jn
Jinhua|jinhua||CN|1wg|nf90|68ow|pn84|j64jmx
Jining|jining|jining shandong|CN|1js|pf4g|7l60|ozah|j64jm1
Jining|jining||CN|16t|61dg|8sl8|o8j4|j64jnh
Jinja|jinja||UG|r9|6gqb|3ec|7467|j64akz
Jinotega|jinotega||NI|ra|13ep|2t0e|-ifkw|j640fl
Jinotepe|jinotepe||NI|bv|mrn|2jek|-ih32|j640f5
Jinshi|jinshi||CN|p0|5vf4|6cn5|nz1x|j64erd
Jinxi|jinxi|jinxi liaoning,lianshan|CN|yg|1fzww|8qg3|pwbc|j64l75
Jinzhou|jinzhou||CN|yg|khnk|8tav|pyed|j64jlt
Jipijapa|jipijapa||EC|11a|rp9|-aew|-h9rc|j64e3x
Jiujiang|jiujiang||CN|r4|bp00|6dec|ouwo|j64jmh
Jiutai|jiutai||CN|r8|4ehj|9gmf|qz0r|j64ezn
Jixi|jixi|jixi heilongjiang|CN|nw|kolk|9pjv|s2k1|j64ltx
Jizan|jizan|jaizan|SA|rb|2966|3mga|94da|j64kbd
Jizzax|jizzax|dzhizak,jizzakh|UZ|rc|51lk|8lf0|ejdo|j649sl
Joaçaba|joacaba||BR|1im|tzw|-5tn8|-b1dk|j647d1
João Pessoa|joao pessoa||BR|1bx|khnk|-1is0|-7h4c|j64k13
Joaquín V. González|joaquin v gonzalez||AR|1hk|abk|-5djl|-dr8q|j647wj
Jodhpur|jodhpur||IN|1fe|lbqw|5mvt|fndw|j64lz1
Joensuu|joensuu||FI|18g|1570|df0w|6doi|j64jrh
Johannesburg|johannesburg||ZA|kg|21mgo|-5lwx|609l|j64n17
John Day|john day||US|1ai|17p|9ipx|-phu8|j648lj
Johnson City|johnson city||US|1pd|1ntu|7s71|-hng0|j642ux
Johnstown|johnstown||US|1cd|1hgm|8n5z|-gwyu|j64983
Johor Bahru|johor bahru|johor baharu,johore bharu|MY|rd|ir5k|bfo|m8dd|j64j5b
Joinville|joinville|norte nordeste catarinense|BR|1im|l6cg|-5n2k|-agv7|j64k0p
Joliet|joliet||US|pl|cecc|8wg4|-ivu3|j642m3
Joliette|joliette||CA|1fa|z01|9v71|-fqm5|j647mv
Jonesboro|jonesboro||US|49|198b|7oka|-jfvm|j648nh
Jönköping|jonkoping||SE|ro|1x9w|cdrl|31aq|j64j0l
Joplin|joplin||US|13u|1kwz|7y5a|-k99n|j648pt
Jorhat|jorhat||IN|4n|1h9l|5qek|k6zb|j646st
Jos|jos||NG|1db|hi9k|24mc|1wlg|j64khn
José Batlle y Ordóñez|jose batlle y ordonez||UY|y2|1vq|-7698|-btb4|j6411j
Juan Aldama|juan aldama||MX|1vx|axe|57fc|-m5rg|j64cwl
Juan José Castelli|juan jose castelli||AR|ck|79p|-5k87|-czpy|j64hht
Juanjuí|juanjui||PE|1i5|t3n|-1jbk|-gg4o|j64b0z
Juazeiro|juazeiro||BR|5z|21ek|-20oo|-8oi0|j64k0z
Juazeiro do Norte|juazeiro do norte||BR|c8|4tse|-1jms|-8fe8|j64k0t
Juba|juba||SS|cc|2eef|119o|6ro8|j64lft
Juchitan|juchitan|juchitan de zaragoza|MX|19l|1g6t|3irw|-kd6g|j645vv
Juigalpa|juigalpa||NI|du|168b|2lfw|-iaso|j64507
Juina|juina||BR|12q|r8|-2fyk|-cr3s|j64grb
Juiz de Fora|juiz de fora||BR|13l|a2sx|-4nz8|-9aom|j64k0h
Juliaca|juliaca||PE|bc|59kb|-3blk|-f17c|j64j3b
Jullundur|jullundur|jalandhar|IN|1ei|ibq0|6psp|g72v|j64l7z
Jumla|jumla||NP|t5|701|69p0|hmdz|j63vrv
Jundiaí|jundiai||BR|1nj|au30|-4z0g|-a1q8|j647zj
Juneau|juneau||US|26|np3|chyd|-st6w|j64maj
Junín|junin||AR|e4|1tlb|-7euu|-d2d1|j64hen
Junín|junin||PE|ri|btk|-2e14|-gahw|j64b2v
Juradó|jurado||CO|dp|1tb|1iy9|-gnz0|j64ea3
Jutiapa|jutiapa||GT|rk|133t|329g|-j9o8|j646ql
Juticalpa|juticalpa||HN|1a4|sw2|3574|-ihcs|j64a71
Jyekundo|jyekundo|gyegu|CN|kc|hqw|72ra|kqed|j64jgd
Jyväskylä|jyvaskyla||FI|cd|23q0|dcej|5ios|j64fzj
Kaabong|kaabong||UG|rq|vl|r5w|7b9s|j64amj
Kabale|kabale||UG|rr|yew|-9n4|6fbs|j64aqn
Kabalo|kabalo||CD|tl|n0p|-1aog|5rn0|j64fbj
Kaberamaido|kaberamaido||UG|ru|2mg|df1|73uy|j63tw1
Kabinda|kabinda||CD|tb|19j0|-1bao|58w0|j64f9n
Kabul|kabul||AF|rv|1y8js|7eci|ett1|j64n2h
Kabwe|kabwe||ZM|cb|41tf|-33f4|63is|j64ld5
Kachiry|kachiry|kashyr|KZ|1c5|6w3|bdkk|gb44|j64g3f
Kadoma|kadoma||ZW|12g|1p3a|-3xfo|6esb|j64jzx
Kadugli|kadugli|kaduqli|SD|1lu|3sir|2cyc|6d60|j64kb7
Kaduna|kaduna||NG|ry|uwnk|296s|1le5|j64lmx
Kaesong|kaesong||KP|rz|78x7|84xk|r4ks|j6465b
Kafr el Sheikh|kafr el sheikh||EG|s0|3336|6o1e|6mpc|j63x9v
Kafue|kafue||ZM|1m0|10oy|-3drc|61fs|j64jzl
Kaga Bandoro|kaga bandoro||CF|168|17m0|1hv0|43zs|j64dpv
Kagoshima|kagoshima||JP|s3|bwig|6rpw|rzez|j64jn7
Kahama|kahama||TZ|1k1|rse|-th0|6ze0|j64aot
Kahemba|kahemba||CD|6i|12kw|-1k71|42ls|j64f6n
Kahramanmaraş|kahramanmaras||TR|rp|825p|8278|7x2i|j644gt
Kaiapoi|kaiapoi||NZ|bn|7vc|-9aqd|1106m|j64n4x
Kaifeng|kaifeng||CN|nx|iou8|7gx3|oibd|j64jl7
Kaikoura|kaikoura||NZ|bn|1oc|-9364|11875|j64n6x
Kailu|kailu||CN|16t|261|9cal|pz6o|j64f0d
Kailua-Kona|kailua kona||US|ns|7m6|47n0|-xfkt|j64iwj
Kaitaia|kaitaia||NZ|18y|40i|-7iwr|114zb|j64n6v
Kaka|kaka||TM|s|tm5|8073|crvk|j649qv
Kakamega|kakamega||KE|1un|1cxu|28o|7fz8|j64bad
Kakata|kakata||LR|11z|q6x|1ecs|-27uq|j63wkb
Kakinada|kakinada||IN|33|6a0r|3mx7|hmjr|j64jp1
Kakonko|kakonko||TZ|uu|j1s|-pb0|6mw0|j64apt
Kaktovik|kaktovik||US|26|2t|f0sv|-us1p|j64jxx
Kalabo|kalabo||ZM|1un|5yr|-37ns|4v00|j64a4h
Kalaburagi|kalaburagi|gulbarga|IN|t6|ad5r|3pvg|ggqw|j64lvn
Kalachinsk|kalachinsk||RU|1a8|ikb|bsrb|fzdf|j64cf1
Kalamata|kalamata||GR|1cb|1jf3|7xsl|4qmu|j64ks3
Kalamazoo|kalamazoo||US|13e|3xhx|92bu|-ice8|j649az
Kalangala|kalangala||UG|s5|40g|-2dt|6wne|j63ts5
Kalasin|kalasin||TH|s6|16im|3irc|m6oi|j63v65
Kalbarri|kalbarri||AU|1uo|16p|-5xh2|ogwz|j64i7t
Kalemie|kalemie||CD|tl|4f5d|-19s5|69b4|j64lun
Kalgoorlie|kalgoorlie||AU|1uo|sfo|-6l5m|q16w|j64m5f
Kalima|kalima||CD|11j|5e|-jd4|5nxo|j64f9f
Kaliningrad|kaliningrad||RU|sb|9bm2|bq2g|4e5p|j64lhz
Kalispell|kalispell||US|147|oqm|abwa|-oi2g|j64jtf
Kalmar|kalmar||SE|sc|r0w|c58u|3iaa|j649lj
Kaltag|kaltag||US|26|5a|dsco|-y0pf|j643oz
Kaltukatjara|kaltukatjara||AU|18x|9v|-5izg|rncl|j64i9b
Kaluga|kaluga||RU|se|79k2|book|7rv0|j64c0x
Kalyan|kalyan||IN|10w|xsiu|44ja|foia|j646sj
Kambove|kambove||CD|tl|sbi|-2bvc|5p8w|j64fbb
Kamenka|kamenka||RU|1ce|cs0|begb|9fuk|j64c5d
Kamenna Obi|kamenna obi|kamen na obi|RU|2h|ydw|bj2o|hfm4|j64cg7
Kamensk Shakhtinskiy|kamensk shakhtinskiy|kamensk shakhtinsky|RU|1gg|1mhy|acxi|8ml2|j645el
Kamensk Uralskiy|kamensk uralskiy|kamensk uralsky|RU|1nc|3wtg|c3cd|d9w6|j64c9t
Kamina|kamina||CD|tl|2rdv|-1vd0|5cz8|j64kpb
Kamloops|kamloops||CA|9r|1h0q|auy3|-pshx|j64kzd
Kampala|kampala||UG|sg|ufog|2gi|6zee|j64mbl
Kampene|kampene||CD|11j|skq|-rrv|5psc|j64f9b
Kamphaeng Phet|kamphaeng phet||TH|sh|19cz|3j3u|lbyy|j63uy3
Kampong Cham|kampong cham||KH|wn|1s81|2klg|mlno|j64hqn
Kampong Spoe|kampong spoe|kam|KH|wp|pn3|2gd4|meh2|j63zbv
Kampong Thum|kampong thum|kampong thom|KH|wq|fe7|2q34|mhbu|j63zcf
Kampot|kampot||KH|wr|12nt|29x7|mbvt|j64hqx
Kamsar|kamsar||GN|8s|qzh|2ag6|-34oy|j64gin
Kamuli|kamuli||UG|si|9uk|7b4|73jx|j63txf
Kamyanets-Podilskyy|kamyanets podilskyy|kamianets podilskyi|UA|ui|2ggy|afnf|5p3l|j643x3
Kamyshin|kamyshin||RU|1tl|2r8y|aqf8|9qb4|j64c37
Kanab|kanab||US|1s7|2nm|7xuy|-o493|j648mf
Kananga|kananga||CD|ta|gea0|-19fl|4stp|j64luh
Kanash|kanash||RU|e0|12hq|bwb7|a69r|j64cbj
Kanazawa|kanazawa||JP|q7|btch|7u3k|tabk|j64jo5
Kanchanaburi|kanchanaburi||TH|sk|1d5f|305q|lbx0|j649uf
Kanchipuram|kanchipuram||IN|1of|3bmd|2r0x|h33j|j64gep
Kandahar|kandahar||AF|sl|fc46|6rwk|e2wl|j64mqd
Kandalaksha|kandalaksha||RU|157|tf2|ee8r|6y40|j64kdx
Kandi|kandi||BJ|2d|2cn9|2dvs|moo|j64hyn
Kandy|kandy||LK|sm|2e6t|1k68|hagc|j64ljp
Kangaba|kangaba||ML|6d|dao|2k4s|-1t4g|j64d4v
Kangar|kangar||MY|1ch|1da5|1dmy|lh2k|j63wpz
Kangerlussuaq|kangerlussuaq||GL|1et|fg|ed31|-ava3|j64jqt
Kangersuatsiaq|kangersuatsiaq|formerly proven|GL||5k|fihg|-bwmb|j64l5x
Kanggye|kanggye||KP|cl|6f3u|8s5g|r4vk|j64dit
Kangirsuk|kangirsuk|payne bay bellin|CA|1fa|f9|cv5k|-f047|j64h5t
Kaniama|kaniama||CD|tl|s5d|-1meo|56hw|j64fb1
Kankakee|kankakee||US|pl|1hpk|8tac|-itxv|j64923
Kankan|kankan||GN|sp|2fyx|2864|-1zu4|j64lzx
Kano|kano||NG|sq|1vau8|2klv|1tq5|j64mv5
Kanoya|kanoya||JP|s3|1rj3|6q5l|s1n8|j646mv
Kanpur|kanpur||IN|1sa|1vrtc|5o6j|h7ql|j64myp
Kansas City|kansas city||US|13u|vhhk|8drm|-k9zg|j64la5
Kansas City|kansas city||US|sr|ar0p|8dsw|-ka65|j641pl
Kansk|kansk||RU|w0|26bi|c1kc|kii4|j64j9p
Kanyato|kanyato||TZ|uu|6g|-ydx|6hhy|j64aq1
Kanye|kanye||BW|1m0|104v|-5co0|5fiw|j64i6l
Kaohsiung|kaohsiung||TW|ss|1ncmo|4un1|prze|j64mst
Kaolack|kaolack||SN|st|5yd0|316k|-3g88|j64lfh
Kaoma|kaoma||ZM|1un|ays|-361g|5bcw|j64a43
Kapiri Mposhi|kapiri mposhi||ZM|cb|t9y|-2zsg|6554|j64a2l
Kapoeta|kapoeta||SS|hu|5fm|10tl|776m|j64ab7
Kaposvár|kaposvar||HU|1l6|2bqo|9xrq|3tcg|j64an1
Kapuskasing|kapuskasing||CA|1aa|74o|alav|-ho25|j647k1
Kara Balta|kara balta||KG|8c|1l79|96he|fu3t|j6455x
Karabük|karabuk||TR|1wk|2r78|8twg|6zjk|j644mz
Karachi|karachi||PK|1kk|77zkg|5bwv|ecvt|j64muv
Karaj|karaj||IR|1p6|uhzs|7o93|ax9t|j64g61
Karakol|karakol||KG|1vp|1i57|93vc|gssq|j64j55
Karaman|karaman||TR|sz|2kwf|7yw7|74ae|j64ajt
Karamay|karamay||CN|1v2|5lqd|9rrv|i6s7|j64jiz
Karamken|karamken||RU|10n|a|cwic|weeq|j64crv
Karasburg|karasburg||NA|t0|4o6|-6078|40lk|j64djl
Karasuk|karasuk||RU|195|m25|bik9|gq0r|j64chv
Karbala|karbala||IQ|t1|ay1w|6znp|9fp1|j64fwz
Karema|karema||TZ|1gh|cn5|-1gle|6itp|j64aof
Kargat|kargat||RU|195|8e9|btw7|h7gb|j64chl
Kariba|kariba||ZW|12g|jp7|-3jjk|6680|j64a6b
Karibib|karibib||NA|im|5bm|-4pa6|3ebm|j63w91
Karimnagar|karimnagar||IN|1p9|66ez|3yfw|gyf0|j64fiv
Karlovac|karlovac||HR|t3|16hj|9qzc|3byu|j646gv
Karlskrona|karlskrona||SE|8m|r64|c1ny|3a0w|j63unx
Karlsruhe|karlsruhe||DE|5r|839r|ai34|1stc|j646fz
Karlstad|karlstad||SE|1tv|1l7h|cq2v|2w5z|j649m7
Karluk|karluk||US|26|2o|cc8b|-x3s6|j649i7
Karnal|karnal||IN|ni|4tnd|6d0k|ghwk|j64fhd
Karoi|karoi||ZW|12g|jba|-3ls4|6d0g|j64a61
Karokh|karokh|karukh|AF|ob|dho|7e3o|deym|j64841
Karonga|karonga||MW|dm|qe7|-24n5|79tx|j64bk7
Karpinsk|karpinsk||RU|1nc|nrr|ct42|cv1e|j64can
Karratha|karratha||AU|1uo|cyk|-4fyg|p1rw|j64m5l
Kars|kars||TR|t7|1nse|8pc5|98jj|j64akb
Kartaly|kartaly||RU|d0|lzr|bdbe|d083|j64c7n
Karumba|karumba||AU|1f2|4t|-3qwh|u6oe|j64k6n
Karungu|karungu||KE|19i|1u0|-6k0|7bi4|j64bkf
Karur|karur||IN|1of|1ncj|2chs|gqht|j64gel
Karusi|karusi|karuzi|BI|t8|89d|-nx4|6gqm|j63zoj
Kasaji|kasaji||CD|tl|98h|-27zi|50xw|j64faj
Kasama|kasama||ZM|18s|4abk|-26p8|6ol3|j64a2h
Kasane|kasane||BW|18q|74y|-3tf4|5e24|j64i5p
Kasangulu|kasangulu||CD|6y|lkp|-zc4|394o|j64f8p
Kasempa|kasempa||ZM|18r|4c6|-2vus|5j88|j64a3l
Kasese|kasese||UG|tc|1fwl|1sl|6fe3|j64j2v
Kashan|kashan||IR|iq|5cwg|7a70|b1zs|j64g4z
Kashgar|kashgar|kashgar city|CN|1v2|auxc|8gln|ga6r|j64mjp
Kashmar|kashmar||IR|1fn|3d8v|7jgm|cj0j|j64jsh
Kasimov|kasimov||RU|1gn|saf|bry3|8ve3|j64c5p
Kasongo|kasongo||CD|11j|1cm0|-yc4|5ppk|j64luj
Kasongo-Lunda|kasongo lunda||CD|6i|fh8|-1dzw|3lv0|j64f7l
Kaspiysk|kaspiysk||RU|fr|1r2w|96tn|a7h0|j64cj3
Kassala|kassala||SD|th|8ls5|3bag|7ssc|j64mct
Kassel|kassel||DE|o3|67pg|azu0|21aw|j646g7
Kasserine|kasserine||TN|ti|1mtv|7jqf|1v9b|j63t6j
Kastamonu|kastamonu||TR|tk|1ibm|8vcy|78o6|j63tnl
Kasulu|kasulu||TZ|uu|sth|-zc4|6g94|j64apx
Katakwi|katakwi||UG|1s5|6hc|elb|7a31|j63u47
Katanning|katanning||AU|1uo|31a|-7810|p70t|j64i8j
Katerini|katerini||GR|u2|154d|8mqr|4tmp|j64fvb
Katherine|katherine||AU|18x|7tp|-33mi|sckq|j64m55
Kathmandu|kathmandu||NP|83|j6l4|5xvm|iaaj|j64mdb
Kati|kati||ML|6d|1fm7|2qds|-1qcg|j64d4l
Katima Mulilo|katima mulilo||NA|bq|jb7|-3r10|576w|j64dl3
Katoomba|katoomba||AU|176|h18|-7831|w7vk|j64ibp
Katowice|katowice||PL|1kh|1muts|art8|42rc|j64dfn
Katsina|katsina||NG|tm|99g5|2s8g|1mn4|j64dax
Kattaqorgon|kattaqorgon|katta kurgan|UZ|1hr|5ao9|8jvj|e79s|j6445n
Katwe|katwe||UG|tc|1id|-100|6ev4|j64aqf
Kaunas|kaunas||LT|tn|812r|bs00|549c|j64bcn
Kavala|kavala||GR|2z|19pk|8rwk|58aa|j646yz
Kavalerovo|kavalerovo||RU|1e5|ee9|9hla|sy1u|j64cpd
Kavaratti|kavaratti||IN|xo|88w|29i2|fkgx|j64fjp
Kavieng|kavieng||PG|173|f80|-jx1|wboi|j64kd5
Kawagoe|kawagoe||JP|1hb|78qz|7p55|twbj|j646pp
Kawambwa|kawambwa||ZM|zr|fvx|-23gj|68ds|j64a23
Kawasaki|kawasaki||JP|sj|ut02|7m5g|txyy|j646pl
Kaya|kaya||BF|1ij|uvl|2t08|-8es|j64iod
Kayes|kayes||ML|tq|1nkn|33hw|-2g9s|j64lwz
Kayes|kayes||CG|97|1c8p|-w94|2ugw|j64lvz
Kayseri|kayseri||TR|ts|cpfs|8avq|7luc|j64k3t
Kayunga|kayunga||UG|tt|gqw|5f5|71rq|j63twd
Kazachye|kazachye|kavache|RU|1hd|0|f5s5|t71y|j64jbh
Kazan|kazan||RU|1p0|nwc8|by6n|aj1o|j64mep
Kearney|kearney||US|16q|och|8q1r|-l8ij|j641sd
Kebili|kebili||TN|tw|fc3|77yc|1x7y|j63t4t
Kecskemét|kecskemet||HU|an|2fvr|a1vs|4808|j644o7
Kediri|kediri||ID|qw|51fr|-1o3s|o074|j64e1n
Kédougou|kedougou||SN|1od|e2a|2ox0|-2lzc|j64b6z
Keelung|keelung||TW|ty|apsw|5dxh|q3at|j648a1
Keetmanshoop|keetmanshoop||NA|t0|dx3|-5p1n|3vw4|j64khx
Keffi|keffi||NG|16i|1uaf|1wa2|1or4|j64dan
Keflavík|keflavik||IS|1n9|64a|dpye|-4u4i|j64k2j
Kelang|kelang|klang|MY|1jc|khnk|nbj|lrjt|j64j5d
Kelo|kelo||TD|1og|228w|1zw3|3dww|j64ef5
Kelowna|kelowna||CA|9r|2oj9|ap14|-plxt|j64k1n
Keluang|keluang|kluang|MY|rd|3n1g|fq7|m57f|j64bh1
Kem|kem||RU|t2|ao5|dx6o|7eqc|j64j65
Kemerovo|kemerovo||RU|u0|a84i|bv08|ig9w|j64ljl
Kemi|kemi||FI|xw|hgx|e379|59o9|j64ktl
Kemijärvi|kemijarvi||FI|xw|6ur|eaej|5vjr|j64jrb
Kempsey|kempsey||AU|176|94w|-6nve|wr6k|j64id1
Kenai|kenai||US|26|5ve|cz8o|-wf44|j64jy3
Kendari|kendari||ID|1mx|3jlt|-uip|q9yt|j64kj7
Kendu Bay|kendu bay||KE|19i|1yeo|-2rw|7fa8|j64bkd
Kenema|kenema||SL|hz|32g1|1ot0|-2ecc|j64b7h
Kenge|kenge||CD|6i|6p|-119k|3mef|j64f6f
Kenitra|kenitra||MA|kr|btre|7cfk|-1ers|j64brd
Kennewick|kennewick||US|1u8|273c|9wki|-pj9d|j6419t
Kenora|kenora||CA|1aa|8dg|ao03|-k8wq|j64l0t
Kentau|kentau||KZ|1lr|18ao|9brx|eopb|j6464l
Kerch|kerch||RU|f8|39fn|9q2d|7tjl|j649mv
Kerema|kerema||PG|mh|4cu|-1p5y|v9ak|j63vxz
Keren|keren||ER|1je|37qo|3czo|88ok|j64ek3
Kerewan|kerewan||GM|zo|24f|2w4c|-3g6u|j63xx5
Kericho|kericho||KE|1fx|249w|-2rw|7k80|j64b9z
Kerikeri|kerikeri||NZ|18y|4io|-7jtp|11a7n|j64n7n
Kerkira|kerkira|corfu,kerkya|GR|q0|tpx|8hoa|49nv|j64ftv
Kerma|kerma||SD|18s|314|47ht|6ip2|j64aa3
Kerman|kerman||IR|u6|cdm2|6hso|c8fk|j64jsl
Kermanshah|kermanshah||IR|u7|hr4p|7dak|a33p|j64kuh
Kérouané|kerouane||GN|sp|bvy|1zj4|-1xlk|j64gib
Keshan|keshan||CN|nw|1jv7|aakn|qz6s|j64f3f
Ketchikan|ketchikan||US|26|6zy|bv4q|-s7xc|j64jxh
Key West|key west||US|jl|mo1|59gw|-hj1f|j64jv5
Khabarovsk|khabarovsk||RU|ub|cerc|advq|sylc|j64llh
Khakhar|khakhar||RU|ub|a|ccyi|t0zg|j64jcx
Khammam|khammam||IN|1p9|68ev|3pc4|h6ip|j64fil
Khandyga|khandyga||RU|1hd|58s|dfj8|t2ao|j64jbx
Khanty Mansiysk|khanty mansiysk||RU|ue|1gbc|d2ov|esf3|j64j7t
Kharkiv|kharkiv||UA|uf|vbbc|aptf|7rox|j64lcl
Khartoum|khartoum|al khartum|SD|ug|2tw7k|3cak|6z0q|j64muj
Khaskovo|khaskovo|haskovo,kurdzhali|BG|nk|1phv|8zn2|5h8x|j64i1j
Khatanga|khatanga||RU|1p3|2h1|ffvf|lymi|j64lkj
Kherson|kherson||UA|f8|6va5|9zth|6zjr|j649n3
Khilok|khilok||RU|dl|877|b07w|no8k|j64jb7
Khiwa|khiwa|khiva|UZ|ul|37jr|8vdj|cxph|j649r3
Khmelnytskyy|khmelnytskyy|khmel nyts kyz,khmelnytskyi|UA|ui|8jd6|ald5|5scf|j643wp
Kholmsk|kholmsk||RU|1he|pe7|a30p|ug5s|j645qj
Khomeini Shahr|khomeini shahr|khomeyni shahr|IR|iq|9daq|70bg|b158|j64g53
Khon Kaen|khon kaen||TH|uk|5dps|3ip4|m1fw|j64j15
Khorgo|khorgo||RU|1hd|a|fr01|ocrw|j645pd
Khorramabad|khorramabad||IR|z9|81i6|76c4|ad2k|j64g6f
Khorugh|khorugh||TJ|lf|n5c|8197|fc2c|j64j11
Khromtau|khromtau||KZ|3s|iar|arvv|cj04|j64jrl
Khujand|khujand||TJ|y9|9dpw|8mvo|ex6v|j64j13
Khulna|khulna||BD|um|xaaw|4w8z|j719|j64m4x
Khvoy|khvoy|khoy|IR|1ub|4cfc|89aw|9mzo|j64g7t
Kiama|kiama||AU|176|80b|-7ftk|wbw0|j64ibl
Kibaha|kibaha||TZ|1em|i8z|-1g7n|8ca7|j63wb7
Kibale|kibale|kibaale|UG|up|40g|668|6npn|j63u2p
Kibiti|kibiti||TZ|1em|n9v|-1nn4|8cjg|j64arb
Kiboga|kiboga||UG|uq|b74|72h|6t66|j63tzz
Kibungo|kibungo||RW|hz|zog|-gpv|6jlh|j63u9z
Kibuye|kibuye||RW|1un|1120|-ftg|6ags|j63u9h
Kiel|kiel||DE|1ja|5rw3|bn7s|265w|j64em3
Kielce|kielce||PL|1ne|4mgl|awo8|4few|j64dfz
Kieta|kieta||PG|18m|5da|-1byr|xcvh|j64bph
Kiffa|kiffa||MR|4m|1l1m|3k8o|-2fyo|j64krp
Kigali|kigali||RW|ut|ifkw|-f24|6fxm|j64le1
Kigoma|kigoma||TZ|uu|3ir0|-11ng|6ch0|j64aqb
Kikwit|kikwit||CD|6i|do2w|-12t8|41g4|j64mk1
Kilchu|kilchu|kilju county|KP|nb|2625|8s1w|rpuc|j64dif
Kilifi|kilifi||KE|ea|1pzn|-ruo|8jhg|j64bk5
Kilindoni|kilindoni||TZ|1em|9kp|-1p2z|8hxw|j64arj
Kilinochchi|kilinochchi||LK|uw|2811|20j8|h8db|j64ahf
Kilis|kilis||TR|ki|1ri5|7vc4|7yf4|j64ak1
Kilkenny|kilkenny||IE|ux|gnp|baaa|-1jyj|j64dov
Killarney|killarney||IE|u8|96m|b5mg|-21fj|j64doz
Killeen|killeen||US|1ph|2yf3|6o3p|-ky2j|j648tl
Kilosa|kilosa||TZ|14l|1ywh|-1grw|7xf0|j64ar1
Kimba|kimba||AU|1lj|ho|-73s8|t8q6|j64iff
Kimbe|kimbe||PG|1uj|ejj|-16to|w6ie|j63vzn
Kimberley|kimberley||ZA|18u|3jio|-65t8|5b4k|j64kbv
Kimchaek|kimchaek||KP|nb|40hy|8ptv|roxn|j64jf1
Kimhyonggwon|kimhyonggwon||KP|1gm|2yn|8qy7|rgup|j64663
Kimmirut|kimmirut||CA|19e|ap|dgyc|-ez81|j64kzp
Kimpese|kimpese||CD|6y|85u|-16tk|33d9|j64f8l
Kimry|kimry||RU|1rd|146e|c6sz|805g|j64bzt
Kindersley|kindersley||CA|1j3|3dr|b14e|-ne2t|j64gz1
Kindia|kindia||GN|uy|2ibq|25mg|-2rb0|j64kv7
Kindu|kindu||CD|11j|5mv6|-mvb|5jx8|j64kp1
Kineshma|kineshma||RU|qh|1zqv|cbfw|912s|j645bx
King Salmon|king salmon||US|26|84|ckuf|-xkt2|j649iz
King Sejong Station|king sejong station||AQ||2i|-dc4p|-clhg|j64iuj
Kingaroy|kingaroy||AU|1f2|6m5|-5ory|wjly|j64ik1
Kingman|kingman||US|48|wjq|7jiz|-og16|j648fn
Kingoonya|kingoonya||AU|1lj|1e|-6mf8|szzc|j64ifb
Kingsport|kingsport||US|1pd|18cb|7u0b|-hp1v|j642vh
Kingston|kingston||JM|uz|k3j8|3upn|-ggca|j64miv
Kingston|kingston||CA|1aa|2g43|9hb5|-ge5d|j64h45
Kingston|kingston||AU|1oy|b37|-97pz|vkn0|j64inx
Kingston South East|kingston south east|kingston se|AU|1lj|5q|-7w7c|tz39|j64iex
Kingston upon Hull|kingston upon hull||GB|v0|6h94|biqo|-2jo|j64act
Kingstown|kingstown||VC||126l|2tgb|-d4bd|j64m73
Kingsville|kingsville||US|1ph|jhs|5wbc|-kz26|j648t7
Kinkala|kinkala||CG|1dn|apm|-xm0|35wk|j63yad
Kinshasa|kinshasa||CD|v2|4o3p4|-xe6|3a5m|j64n1v
Kipili|kipili||TZ|1gh|16l|-1lcp|6k40|j64aob
Kipushi|kipushi||CD|tl|2fgj|-2iqk|5u9g|j64fb5
Kirensk|kirensk||RU|q6|a9o|cdvl|n673|j64cm7
Kırıkkale|kirikkale||TR|v1|4iwy|8jhk|76pw|j64ak5
Kirkenes|kirkenes||NO|ji|2j6|ey02|6fvo|j64kbl
Kırklareli|kirklareli||TR|v3|18xb|8y3a|5u2s|j63tm3
Kirksville|kirksville||US|13u|et5|8m4x|-judg|j641s1
Kirkuk|kirkuk||IQ|4u|cw2h|7lpe|9ij7|j64lxh
Kirkwall|kirkwall||GB|14g|6k4|cmzq|-mrg|j64aip
Kirov|kirov|vyatka|RU|v4|9syl|ck31|an98|j64lj1
Kirov|kirov||RU|se|uc7|blbo|7cp4|j64c11
Kirovo-Chepetsk|kirovo chepetsk||RU|v4|1xn0|cjt4|aq58|j645i5
Kirovohrad|kirovohrad|kropyvnytskyi|UA|v5|5cha|ae9d|6wx7|j649od
Kirovsk|kirovsk||RU|157|mud|ehob|77sf|j64bxh
Kirs|kirs||RU|v4|8s9|cpo2|b74k|j64c9b
Kirsanov|kirsanov||RU|1oe|dvb|bab2|95ly|j645gp
Kırşehir|kirsehir||TR|v6|20sg|8e0s|7bny|j63tof
Kiruna|kiruna||SE|18b|e0a|ejj8|4bzq|j64k8b
Kirundo|kirundo||BI|v7|4oz|-jxz|6g8c|j63zrj
Kisangani|kisangani||CD|1an|cecm|40g|5elk|j64lrd
Kiselevsk|kiselevsk|kiselyovsk|RU|u0|288w|bko0|ikio|j645lb
Kishkenekol|kishkenekol||KZ|18h|58b|bhv4|fi6u|j64g2x
Kisii|kisii||KE|19i|m0z|-560|7g7k|j64bkj
Kislovodsk|kislovodsk||RU|1mb|2ug3|9et8|95mo|j6459p
Kismaayo|kismaayo|kismayo|SO|rf|517o|-2r2|942n|j64kh1
Kisoro|kisoro||UG|v8|9yc|-ag3|6d5j|j63u8x
Kissidougou|kissidougou||GN|j7|1fjz|1ywx|-2634|j64gjf
Kissimmee|kissimmee||US|jl|4tzq|62ax|-hg5a|j648y5
Kisumu|kisumu||KE|19i|8h9b|-p0|7g4s|j64kl3
Kita|kita||ML|tq|ztv|2sp4|-2169|j64d5h
Kitakyūshū|kitakyushu||JP|jw|ldpc|79cg|s1ew|j64ezt
Kitale|kitale||KE|1fx|384f|7y9|7hzf|j64ba3
Kitami|kitami||JP|of|2fap|9eco|uuc8|j64f51
Kitchener|kitchener||CA|1aa|8xrd|9b9g|-h954|j647kz
Kitgum|kitgum||UG|v9|17wb|pgs|71mk|j64alx
Kitty Hawk|kitty hawk||US|18e|2mt|7qdh|-g853|j6493j
Kitwe|kitwe||ZM|eu|8of9|-2quc|61qw|j64ldb
Kivalina|kivalina||US|26|ae|eimb|-z96j|j649ij
Kizel|kizel||RU|1ci|h2v|cnqs|ccpj|j6462j
Klagenfurt|klagenfurt||AT|ws|1xwy|9zq3|32f0|j64i2n
Klaipėda|klaipeda||LT|vb|44dv|bxxw|4iyn|j64bbz
Klaksvík|klaksvik||FO|j2|3lk|dc87|-1ege|j640kx
Klamath Falls|klamath falls||US|1ai|x5u|91t6|-q3nx|j64ixz
Klerksdorp|klerksdorp||ZA|18n|3u21|-5reo|5peg|j64kcl
Klin|klin||RU|14o|1qbu|c2qv|7v63|j645dh
Klintsy|klintsy||RU|9y|1f6o|bb50|6wsw|j64byh
Klyuchi|klyuchi||RU|sf|u9|c2ew|yh4k|j64jg1
Knoxville|knoxville||US|1pd|e1pk|7pjo|-hzj4|j64lbh
Knysna|knysna||ZA|1up|1coy|-7all|4xq5|j64bip
Kōbe|kobe||JP|p6|wrdq|7flc|syz8|j64jod
København|kobenhavn|copenhagen|DK|oo|n96w|bxmt|2oxb|j64mz1
Koblenz|koblenz||DE|1ft|6p89|asi9|1mn4|j64em7
Kobuk|kobuk||US|26|47|ec9c|-xmi2|j643q5
Kochi|kochi||IN|u5|wk2g|25ai|gc4s|j64lvd
Kōchi|kochi||JP|vd|76xe|76yw|smdr|j64ltb
Kodiak|kodiak||US|26|7at|cdws|-wnza|j64ma3
Kodinskiy|kodinskiy|kodinsk|RU|w0|c3a|ckx1|l99d|j64cmp
Koforidua|koforidua||GH|hz|3cvh|1azs|-208|j64ffb
Kōfu|kofu||JP|1va|48f8|7n2w|tpbd|j64f5t
Kogalym|kogalym||RU|ue|18wg|daqm|fyst|j64cen
Kogon|kogon|kagan|UZ|a4|2azy|8ihn|du1e|j649qz
Kohat|kohat||PK|15m|7coj|77a3|fb6f|j6456x
Kohima|kohima||IN|15o|1z2p|5i1q|k67i|j64fld
Kohtla-Järve|kohtla jarve||EE|pg|zjg|cqc0|5uip|j646ix
Koidu|koidu||SL|hz|1vjn|1t4l|-2bpw|j64b7d
Kok Yangak|kok yangak|kokjanggak|KG|qn|bko|8slf|fouy|j6456j
Kokkola|kokkola||FI|1uq|101m|dojh|4ydb|j64jrd
Koko|koko||NG|tv|jwg|2g54|yuq|j64dbn
Kokomo|kokomo||US|pv|1b5t|8oec|-igm0|j6492n
Kokshetau|kokshetau||KZ|3q|2rft|bf9k|evnc|j64jrz
Koktokay|koktokay||CN|1v2|1pq8|a2no|j6bu|j64ep7
Kolar|kolar||IN|t6|33ld|2tc9|gqvq|j64fjz
Kolda|kolda||SN|vg|1hg3|2rm8|-37cs|j64b6p
Kolhapur|kolhapur||IN|10w|g2pc|3kuw|fwoo|j64lvp
Kolkata|kolkata||IN|1ud|8sxq0|4tl5|ixi3|j64n41
Kollam|kollam||IN|u5|8g4z|1woc|getg|j64fj3
Kolomna|kolomna||RU|14o|35yi|bt00|8b9m|j645dv
Kolpashevo|kolpashevo||RU|1qg|lic|chuk|hsea|j64j5n
Kolpino|kolpino||RU|e3|4u89|csvo|6khw|j645b5
Kolwezi|kolwezi||CD|tl|8yj4|-2aov|5gjo|j64mk5
Kom Ombo|kom ombo||EG|4s|6ije|58t8|728s|j64knn
Komatini|komatini|komotini|GR|2z|z7j|8tdx|5g47|j63y27
Kombissiri|kombissiri||BF|7j|n95|2l34|-aak|j63zv3
Kompong Chhnang|kompong chhnang|kampong chhnang,kampong chnang|KH|wo|1m24|2mix|mfm2|j64hqt
Komsa|komsa||RU|w0|a|d9dk|j4pt|j64j9n
Komsomolets|komsomolets||KZ|1ew|7la|biqq|das6|j64g0n
Komsomolsk na Amure|komsomolsk na amure|komsomolsk on amur|RU|ub|5ww4|au32|td94|j64jd3
Kon Tum|kon tum||VN|1ey|29e9|32zi|n57d|j649zx
Kondopoga|kondopoga||RU|t2|qig|dc07|7ckn|j64ke1
Kondoz|kondoz|konduz,kunduz|AF|wa|5kgx|7ve8|erf9|j64hpv
Koneurgench|koneurgench|konye urgench|TM|1ow|o88|92in|coj7|j6444j
Kongolo|kongolo||CD|tl|296a|-15ib|5s6g|j64fbf
Konibodom|konibodom||TJ|y9|5kis|8mwa|f3f4|j6446x
Konotop|konotop||UA|1n3|27wb|aze0|748q|j643zp
Kontagora|kontagora||NG|17l|2476|2890|167f|j64d7p
Kontcha|kontcha||CM|d|66q|1ph2|2me5|j64hn5
Konya|konya||TR|vn|jp3s|849e|6ykb|j64ldv
Konza|konza||KE|1fx|1jo|-di0|7yf4|j64b97
Korçë|korce||AL|vr|18yb|8pef|4g8j|j63yrx
Korf|korf||RU|sf|b4|cxix|zjgn|j64dm1
Korhogo|korhogo||CI|1j7|3t4f|20zs|-17io|j64kv1
Kōriyama|koriyama||JP|jx|7as0|80no|u36g|j646q3
Korla|korla||CN|1v2|d4zs|8xzo|igqk|j64jip
Korogwe|korogwe||TZ|1oh|12kw|-139s|89dk|j64att
Koror|koror||PW||8n4|1koc|stkn|j64ith
Korosten|korosten||UA|1wh|1kbc|ax4w|652c|j649op
Korsakov|korsakov||RU|1he|r2r|9zw8|ulof|j64jdp
Kos|kos||GR|190|euk|7wo9|5uk8|j64fvt
Košice|kosice||SK|vw|52j7|ag08|4jys|j64bcd
Kosti|kosti||SD|1uu|7e98|2tmc|7008|j64kb1
Kostroma|kostroma||RU|vt|5y8o|cdr8|8rw8|j64keh
Koszalin|koszalin||PL|1uk|2awq|bm7k|3gvd|j6489f
Kota|kota||IN|1fe|hq48|5eaz|g94r|j64lyz
Kota Baharu|kota baharu|kota bharu|MY|tz|au3z|1b80|lwt8|j64kkd
Kota Kinabalu|kota kinabalu||MY|1gv|bb5j|1a54|ovws|j64kkv
Kotabumi|kotabumi||ID|xs|wou|-11al|mhew|j64km7
Kotelnich|kotelnich||RU|v4|lxr|chvl|acsh|j64c9j
Kotlas|kotlas||RU|4a|1a7b|d4pj|a01z|j64keb
Kotlit|kotlit|kotlik|US|26|ru|didm|-z1zh|j649jd
Kotovsk|kotovsk||RU|1oe|pit|b9tn|8w90|j64c61
Kotzebue|kotzebue||US|26|2gq|ec6z|-yulq|j649kb
Koudougou|koudougou||BF|9b|1veb|2mix|-iac|j64io1
Koulamoutou|koulamoutou|kaulomoutou|GA|19t|cim|-8qp|2obl|j64fmp
Koulikoro|koulikoro||ML|6d|igf|2rep|-1m98|j64krv
Koundara|koundara||GN|8s|asm|2oao|-2ulc|j63yfp
Koupéla|koupela||BF|vv|oqc|2lyi|-2qw|j63zyt
Kouroussa|kouroussa||GN|sp|az3|2a76|-24bs|j63ydv
Koutiala|koutiala||ML|1kf|28yn|2nls|-167g|j64d5l
Kouvola|kouvola||FI|1m1|o0t|d1q0|5q36|j63y5h
Kovda|kovda||RU|157|k|eal3|71mm|j64j5x
Kovel|kovel||UA|1to|1j0l|az6z|5apq|j649o3
Kovrov|kovrov||RU|1tj|3b00|c2vo|8uwk|j64c6b
Koyuk|koyuk||US|26|72|dx2z|-yjhz|j649jn
Koyukuk|koyukuk||US|26|2t|dwmb|-xsts|j643pn
Kozhikode|kozhikode||IN|u5|kfc8|2eto|g8mo|j64m7z
Kpalimé|kpalime||TG|1dc|25j3|1h8s|4v0|j649dl
Krabi|krabi||TH|vx|o37|1q4o|l77k|j63uvp
Kracheh|kracheh|kratie|KH|w4|fev|2o7m|mq34|j63ze7
Kragujevac|kragujevac||RS|1xe|3o3h|9fns|4hf4|j647ol
Kraków|krakow||PL|yc|g7c0|aqa3|49zx|j64ln1
Kramatorsk|kramatorsk||UA|h6|3y21|afx6|81m8|j64417
Krasino|krasino||RU|4a|a|f5rm|bnww|j64j67
Krasnoarmeysk|krasnoarmeysk||RU|1iz|jxt|axni|9slq|j64kfn
Krasnodar|krasnodar||RU|vz|dxff|9ndk|8cxc|j64lil
Krasnogorsk|krasnogorsk||RU|1he|2js|adxk|ugdg|j64cs7
Krasnokamensk|krasnokamensk||RU|dl|15ws|aqbd|pap5|j64jb3
Krasnokamsk|krasnokamsk||RU|1ci|14nl|cg3v|by4j|j64dgt
Krasnoturinsk|krasnoturinsk|krasnoturyinsk|RU|1nc|1e26|ctdo|cypc|j645id
Krasnoufimsk|krasnoufimsk||RU|1nc|x9t|c4pz|cdo2|j64cax
Krasnouralsk|krasnouralsk||RU|1nc|fvf|ci8r|cvcz|j645ix
Krasnoyarsk|krasnoyarsk||RU|w0|jtqg|c07z|jwjl|j64mfh
Kremenchuk|kremenchuk||UA|1dj|4zl2|aiqb|75y0|j649pl
Kribi|kribi||CM|1ml|16m0|mos|24gs|j64h93
Krishnanagar|krishnanagar||IN|1ud|34li|50ej|iz3o|j64jsx
Kristiansand|kristiansand||NO|1t1|1d8m|cgte|1pq8|j64lg3
Kristianstad|kristianstad||SE|1kw|ou4|c0cx|311x|j64auj
Krong Koh Kong|krong koh kong|koh kong,krong kaoh kong|KH|tu|pke|2hn3|m2mx|j64hqf
Kroonstad|kroonstad||ZA|1ae|288o|-5xfc|5tyc|j64kcn
Kropotkin|kropotkin||RU|vz|1pf3|9qo7|8p4t|j645gd
Krujë|kruje||AL|ho|gfa|8wd2|48r6|j63ynj
Kryvyy Rih|kryvyy rih|kryvyi rih|UA|h1|dzdo|a9tf|75ai|j64403
Ksar El Kebir|ksar el kebir||MA|1oi|6kko|7i7w|-19lo|j64bqx
Kuala Lipis|kuala lipis||MY|1bh|bx4|wa8|lvd0|j63wqp
Kuala Lumpur|kuala lumpur||MY|1jc|v1a8|og6|lspg|j64mvp
Kuala Terengganu|kuala terengganu||MY|1qx|7i82|154o|m3og|j64bhl
Kualakapuas|kualakapuas||ID|s9|rhs|-nx0|oibw|j64fc1
Kuantan|kuantan||MY|1bh|7ul1|tjw|m580|j64kkh
Kuching|kuching||MY|1j1|c84n|bt0|nnb8|j64lpn
Kudymkar|kudymkar||RU|vi|p0n|cnde|bpju|j64dgh
Kugluktuk|kugluktuk||CA|19e|106|ej4z|-oob9|j64m1x
Kuito|kuito||AO|8k|2g6m|-2niw|3mpk|j64l3f
Kukës|kukes||AL|w5|drc|90pq|4do4|j63yq1
Kullorsuaq|kullorsuaq||GL||ci|fzg5|-c9ju|j64iwf
Kulob|kulob||TJ|uh|2gv0|84lo|eye5|j649sd
Kulunda|kulunda||RU|2h|bu9|b9qb|gx5t|j64cgh
Kulusuk|kulusuk|kap dan|GL|vk|7y|e1wy|-7ywp|j64jqh
Kumaka|kumaka||GY|1ru|1ou|u3g|-cigo|j64a7f
Kumamoto|kumamoto||JP|w6|fe6w|713d|s0hq|j64ezx
Kumasi|kumasi||GH|4l|za28|1fmv|-clc|j64kpn
Kumba|kumba||CM|1mq|33fh|zt0|20u8|j64h8l
Kumbakonam|kumbakonam||IN|1of|2zgg|2cq5|h0nk|j64gf7
Kumbo|kumbo||CM|184|2otq|1bzw|2aeo|j64hlt
Kumertau|kumertau||RU|72|1eeh|bb7o|byfn|j64c6t
Kumi|kumi|kumi town|UG|w7|a14|b9s|79up|j63tvj
Kumo|kumo||NG|la|rk0|25ih|2eir|j64d9v
Kundian|kundian||PK|1ei|rbi|6yei|fbha|j64bdx
Kundiawa|kundiawa||PG|de|78n|-1ah2|v2io|j63vxf
Kungur|kungur||RU|1ci|1f85|cb64|c7gn|j64dgn
Kunming|kunming||CN|1vt|1qtko|5dgf|m09o|j64mx7
Kununurra|kununurra||AU|1uo|4dr|-3dnm|rlb9|j64k47
Kuopio|kuopio||FI|i1|1yws|dhan|5xp1|j64fzn
Kupang|kupang||ID|19g|61wc|-26jf|qhkm|j64lq7
Kupina|kupina|kupino|RU|195|clp|bnfs|gk92|j645m1
Kupyansk|kupyansk|kupiansk|UA|uf|1ouu|annm|823x|j649p3
Kuqa|kuqa|kuqa county|CN|1v2|a348|8xz1|hrxw|j64jit
Kure|kure||JP|oc|47zz|7ca6|sevs|j64exl
Kurgan|kurgan||RU|wc|7crd|bvxk|e07e|j64j6n
Kurnool|kurnool||IN|33|93vc|3e58|gq30|j64kpz
Kursk|kursk||RU|wd|8rx3|b388|7r8s|j64j6f
Kurtamysh|kurtamysh||RU|wc|du8|brof|dt65|j64c85
Kuruman|kuruman||ZA|18u|7py|-5vsw|50pk|j64bil
Kushiro|kushiro||JP|of|497q|97li|uy03|j64lu3
Kuta|kuta|denpasar|ID|66|n5o|-1v8v|oorl|j64e0j
Kütahya|kutahya||TR|wv|3yr4|8g60|6exw|j644fp
Kutaisi|kutaisi||GE|pr|3xxl|9204|95pg|j646z5
Kuujjuaq|kuujjuaq||CA|1fa|zd|cgaw|-ens0|j64m2h
Kuujjuarapik|kuujjuarapik||CA|1fa|yj|bujz|-go1m|j64m2f
Kuwait City|kuwait city|al kuwayt,kuwait|KW|1o|187tk|6amt|aa6s|j64mwx
Kuybyshevskiy|kuybyshevskiy|kuybyshevsk|TJ|uh|6vx|851u|eq0a|j649s7
Kuznetsk|kuznetsk||RU|1ce|21qu|bdvo|9zkg|j64c5h
Kwekwe|kwekwe||ZW|13h|24i5|-4228|6dxs|j64a57
Kwinana|kwinana|kwinana beach|AU|1uo|fhy|-6wre|otae|j64i91
Kyakhta|kyakhta||RU|af|e7z|asiv|mte7|j64jaj
Kyaukphyu|kyaukphyu|kyaukpyu|MM|1fg|3ad|45wy|k1ty|j64iqb
Kyiv|kyiv|kiev|UA|us|1m2a0|at5t|6jgb|j64n0n
Kyoto|kyoto||JP|wl|12oqw|7ib3|t3ft|j64lu7
Kyrenia|kyrenia||||klp|7kks|7576|j6408b
Kyshtym|kyshtym||RU|d0|13a7|bxs8|cza3|j64c81
Kyustendil|kyustendil||BG|wm|13ej|929n|4v33|j64i21
Kyzyl|kyzyl||RU|1ra|2bio|b2yz|k89j|j64lkl
L'Aquila|l aquila|aquila|IT|5|1guv|92s0|2vbg|j64dsp
L'Ariana|l ariana|aryanah|TN|11n|23dj|7wgr|26pc|j63t5n
La Asunción|la asuncion||VE|19a|r2k|2d4t|-doxd|j640a1
La Barca|la barca||MX|qp|r9t|4chg|-lzcw|j64cy3
La Ceiba|la ceiba||HN|51|34li|3dmn|-ilqa|j64j1l
La Coruña|la coruna|a coruna|ES|k7|7xyq|9ac4|-1syw|j64j1z
La Crosse|la crosse||US|1uw|1vf9|9dz2|-jk0a|j642yx
La Cruz|la cruz||MX|1kj|96k|54kk|-mwug|j64cvh
La Cruz|la cruz||CR|m4|3bz|2df4|-icq4|j64e6z
La Esmeralda|la esmeralda||VE|2q|46|ohm|-e1re|j64jwv
La Esperanza|la esperanza||HN|py|43q|32le|-iwar|j63thh
La Grande|la grande||US|1ai|bks|9pq7|-pb5u|j641l1
La Grange|la grange|lagrange|US|kn|oio|72wt|-i83z|j642jd
La Libertad|la libertad||GT|1co|6o6|3lh8|-jbdc|j64fcj
La Ligua|la ligua||CL|1sl|kkp|-6ygo|-f9ow|j646vl
La Oroya|la oroya||PE|ri|pq9|-2gw0|-g9yg|j644w3
La Palma|la palma||PA|fz|1f9|1ssu|-gqxm|j64bqt
La Paloma|la paloma||UY|1g9|2hq|-7fik|-blz8|j6413v
La Paz|la paz||BO|x6|y2uo|-3ja8|-elv3|j64mql
La Paz|la paz||MX|62|42fb|569k|-nn8g|j64llp
La Paz|la paz||HN|x6|djn|32hs|-isko|j63thx
La Paz|la paz||AR|138|3e8|-7685|-eh7w|j64hb7
La Plata|la plata||AR|e4|evot|-7hd4|-cf80|j64het
La Rioja|la rioja||AR|x7|3hh8|-6axf|-ebtg|j64l2f
La Rochelle|la rochelle||FR|1di|1net|9w83|-8vg|j64kqh
La Romana|la romana||DO|x8|4gtx|3y3u|-es5e|j64itx
La Ronge|la ronge||CA|1j3|2x3|bt5k|-mki0|j647hj
La Sarre|la sarre||CA|1fa|5k6|agjk|-gz40|j647nd
La Scie|la scie||CA|179|mp|apjq|-bwvq|j647o3
La Serena|la serena||CL|ew|3b89|-6epk|-f9ro|j64lwj
La Unión|la union||SV|xa|kon|2uvc|-itrq|j63wxj
La Unión|la union||CL|zg|kai|-8mvo|-fnys|j646wn
La Vega|la vega||DO|xb|3hx9|449y|-f43y|j646qv
La Victoria|la victoria||PY|2i|3uw|-4rzk|-cf2g|j64b3p
Laascaanood|laascaanood|las anod|||1adg|1t2l|a53j|j6405v
Laayoune|laayoune||MA|y4|414k|5tho|-2tuo|j64lnx
Labasa|labasa||FJ|1un|inv|-3io6|12g4p|j64jpt
Labé|labe||GN|xd|30gv|2fcg|-2mwo|j64kv3
Labinsk|labinsk||RU|vz|1bsp|9kek|8qdv|j64c4n
Labrador City|labrador city||CA|179|7yh|bchy|-ecbr|j64m2l
Labutta|labutta||MM|5d|1ab|3gpf|kapy|j64iql
Lac La Biche|lac la biche||CA|29|2ay|bqmf|-nzxb|j647id
Ladysmith|ladysmith||ZA|wh|10jz|-64af|6ds8|j64bnl
Lae|lae||PG|14k|2t4c|-1fya|vi6k|j64lhb
Lafayette|lafayette||US|zl|3e2u|6h0w|-jq13|j64iyh
Lafayette|lafayette||US|pv|2vdl|8nv0|-imcu|j642p3
Lafia|lafia||NG|16i|2q6c|1tig|1tqo|j64daj
Laghouat|laghouat||DZ|xi|2fv4|78vo|m80|j64l4d
Lagos|lagos||NG|xj|5mw0g|1dqc|q5k|j64n3b
Lagos de Moreno|lagos de moreno||MX|qp|20mn|4kw8|-luhw|j64cy7
Laguna|laguna||BR|1im|un3|-63r4|-age0|j647cx
Lagunas|lagunas||CL|1oo|a|-4hwl|-exoh|j64fqz
Lahad Datu|lahad datu||MY|1gv|29hy|12xs|pd34|j64bhp
Lahat|lahat||ID|1n0|1euq|-tbk|m6v9|j64kmb
Lahij|lahij||YE|xm|1f5c|2sra|9mbq|j649h7
Lahore|lahore||PK|1ei|3wyug|6rj7|fxo9|j64mut
Lahti|lahti||FI|1en|2496|d2mr|5i15|j64jrf
Laï|lai||TD|1og|eye|20hq|3ht6|j640ld
Laiwu|laiwu||CN|1js|2nrg|7rbo|p7vc|j64evj
Laiyang|laiyang||CN|1js|5cwg|7x90|pve4|j64jmb
Lajes|lajes|lages|BR|1im|3j2c|-5ykw|-as70|j64gu1
Lake Charles|lake charles||US|zl|1sod|6h88|-jz9o|j641wl
Lake City|lake city||US|jl|moj|6gy1|-hpnh|j642h3
Lake Havasu City|lake havasu city||US|48|17b9|7e6v|-oi0b|j641cf
Lake Louise|lake louise||CA|29|yo|b0v5|-owh5|j64gzl
Lake Minchumina|lake minchumina||US|26|w|dox8|-wn8y|j643s5
Lakeville|lakeville||US|13m|5lmk|9kit|-jzgp|j648bp
Lalitpur|lalitpur||NP|83|78mx|5xh6|iafp|j6457h
Lamar|lamar||US|ei|6ng|85vl|-lzte|j648j3
Lamas|lamas||PE|1i5|akd|-1dm4|-gefk|j644v1
Lambaréné|lambarene||GA|14x|jj2|-5ec|26ty|j64flv
Lamia|lamia||GR|1md|10ge|8c5a|4t3o|j63y0z
Lampang|lampang||TH|xq|4dgx|3x50|lblp|j649tj
Lamphun|lamphun||TH|xr|atq|3yrq|l8gk|j63uxj
Lamu|lamu||KE|ea|ix9|-hgc|8rql|j64kkz
Lancaster|lancaster||US|bb|4u87|7fqc|-pbji|j64jtx
Lancaster|lancaster||US|1cd|4hn5|8kxm|-gcs2|j64363
Lancaster|lancaster||US|19y|11od|8ih4|-hpdx|j642up
Lander|lander||US|1uz|59h|96i2|-nazi|j641mf
Lạng Sơn|lang son||VN|wy|3674|4okc|mvqq|j63taz
Langfang|langfang||CN|nu|hd00|8gyf|p0al|j64jkx
Langsa|langsa||ID|7|2ih4|1028|kzww|j64duf
Langzhong|langzhong||CN|1k9|1apq|6rn3|mpmw|j64es5
Lankaran|lankaran||AZ|4o|1afo|8b10|agxr|j64hol
Lansdowne House|lansdowne house|neskantaga first nation|CA|1aa|3c|b6wm|-iu41|j64l0l
Lansing|lansing||US|13e|600g|95qf|-i4d7|j64j05
Lanxi|lanxi||CN|nw|1jyo|9wzs|r2co|j64f3b
Lanzhou|lanzhou||CN|kc|1iw2w|7q84|m8ul|j64mvt
Lao Chi|lao chi|lao cai|VN|103|1fuu|4tme|ma7g|j649yd
Laoag|laoag||PH|pn|4frc|3wf8|pui8|j64lk3
Lapa|lapa||BR|1bw|jrp|-5irk|-anpw|j647bl
Lappeenranta|lappeenranta||FI|1lq|19qk|d373|61gp|j64fzt
Larache|larache||MA|1oi|2knm|7jlw|-1bj4|j64br1
Laramie|laramie||US|1uz|ks6|8ure|-mmqq|j64iy5
Laranjal do Jari|laranjal do jari||BR|2n|yq0|-6k4|-b8xs|j64l0f
Laredo|laredo||US|1ph|9bgw|5w8l|-lbsw|j64lat
Larissa|larissa|larisa|GR|1pl|2rcm|8hsg|4szs|j64fuh
Larkana|larkana||PK|1kk|7sw1|5wo2|emac|j64lgh
Larnaka|larnaka|larnaca|CY|xy|11rn|7hf6|77jc|j6404z
Laryak|laryak||RU|ue|a|d3gk|h782|j64cej
Las Cruces|las cruces||US|175|2gv3|6xbq|-mvwi|j648kj
Las Heras|las heras||AR|138|1ffr|-71a2|-eqvl|j647pv
Las Lajas|las lajas||AR|16x|xu|-896z|-f2ya|j64hbh
Las Lomitas|las lomitas||AR|jm|5xf|-5al0|-czlc|j64hi3
Las Palmas|las palmas|las palmas de gran canaria|ES||841r|60tk|-3b24|j64m7b
Las Plumas|las plumas||AR|dv|gt|-9b03|-eewk|j64hal
Las Tablas|las tablas||PA|zh|8ri|1nvo|-h7g0|j64bqj
Las Tunas|las tunas|victoria de las tunas|CU|xz|4d5w|4hq9|-ghs8|j64e87
Las Vegas|las vegas||US|16z|132mw|7rev|-op24|j64m8j
Las Vegas|las vegas||US|175|d46|7mo2|-mjwh|j641ix
Lascano|lascano||UY|1g9|5ds|-77so|-bm7k|j648b3
Lashkar Gah|lashkar gah||AF|o9|4bii|6rp2|dsls|j63z63
Lata|lata||SB|1pc|fd|-2aus|zjrb|j64bv5
Latacunga|latacunga|la tacunga|EC|f5|21a4|-768|-guk4|j64e3f
Latakia|latakia|al ladhiqiyah|SY|y1|bk0b|7m88|7o2w|j643gb
Latur|latur||IN|10w|80vu|3xz8|getg|j64jpd
Launceston|launceston||AU|1oy|1jwq|-8vtu|vj9i|j64k77
Laurel|laurel||US|13t|m95|6sku|-j3sx|j642kf
Lausanne|lausanne||CH|1ss|5p0m|9z14|1fb8|j64au1
Lautoka|lautoka||FJ|1un|174m|-3rxd|121ca|j64flp
Laverton|laverton||AU|1uo|8s|-64vy|q8h4|j64k4z
Lavras|lavras||BR|13l|1qv4|-4jyo|-9nas|j64gq5
Lavrentiya|lavrentiya||RU|dw|yi|e21l|-10nmy|j645a3
Lawrence|lawrence||US|sr|1zjq|8cm6|-kezs|j641px
Lawton|lawton||US|1a3|1yso|7eyu|-l3c4|j648qx
Lázaro Cárdenas|lazaro cardenas||MX|13f|3fiv|3ukj|-lwkw|j64cyf
Le Havre|le havre||FR|nr|56to|alze|t6|j64lw7
Le Mans|le mans||FR|1c6|33ib|aadg|rs|j64fnf
Lead|lead||US|1ln|27u|9i7o|-m8nu|j641vp
Lebowakgomo|lebowakgomo||ZA|ys|pp8|-56q4|6bmg|j64bn5
Lebu|lebu||CL|aw|h8p|-8274|-fsac|j64fsz
Lecce|lecce||IT|3m|3hg6|8nf8|3w1o|j64drv
Leeds|leeds|west yorkshire|GB|1um|wrs8|bjdc|-c7g|j64j2p
Leesburg|leesburg||US|jl|1292|66ax|-hjtd|j642gl
Leeton|leeton||AU|176|5mr|-7ejt|vdlx|j64iaz
Leeuwarden|leeuwarden||NL|jq|2p1u|bevs|18mi|j64bap
Legazpi|legazpi||PH|28|6uz5|2tmc|qiv0|j64j8p
Leh|leh||IN|xg|nti|7blc|gmjv|sm0fux
Lehututu|lehututu||BW|u9|1hy|-54y8|4or0|j64i4x
Leicester|leicester||GB|y6|9tdr|ba3g|-8qs|j644lp
Leikanger|leikanger|hermansverk|NO|1l1|1il|d43d|1gus|j63vot
Leipzig|leipzig||DE|1gy|bmm9|b03u|2nr8|j64eod
Leiria|leiria||PT|y7|yt4|8imm|-1vxu|j63vcn
Lemosos|lemosos|lemesos,limassol|CY|yo|3ats|7fk2|72vx|j64is7
Lemsid|lemsid|lamssid|MA|xc|2s|5oui|-2yuq|j64dlf
Lenger|lenger||KZ|1lr|hsi|91jf|ez73|j6464f
Leninobod|leninobod||TJ|y9|8uk|8ipo|eseo|j640e3
Leninogorsk|leninogorsk||RU|1p0|1f4n|bpab|b8p3|j645kn
Leninsk Kuznetsky|leninsk kuznetsky||RU|u0|2c4f|bprc|igw4|j645l1
Lensk|lensk||RU|1hd|jqt|d0k5|omxq|j64ll5
Leo|leo||BF|1kr|kqs|2dlo|-g6s|j63zwx
León|leon|leon de los aldama,leon de los aldamas|MX|m5|vw5c|4j7j|-lsqk|j64lmh
León|leon||NI|yf|3ivt|2nyc|-imd6|j64j3t
León|leon||ES|c1|2x43|94js|-16z8|j643fh
Leonara|leonara|leonora|AU|1uo|6b|-66un|q068|j64k4x
Leopoldina|leopoldina||BR|13l|102e|-4m4k|-950g|j6475x
Lerwick|lerwick||GB|2|536|cw4c|-8vg|j64k7b
Les Cayes|les cayes||HT|1ml|3rdt|3wfo|-ft24|j64abd
Leshan|leshan||CN|1k9|osqw|6c5m|m8ea|j64jk7
Lesosibirsk|lesosibirsk||RU|w0|1evt|chep|jtlt|j64j9x
Lesozavodsk|lesozavodsk||RU|1e5|w8i|9qvw|slju|j64jbf
Lethbridge|lethbridge||CA|29|1ihl|anhp|-o6ml|j64gzf
Lethem|lethem||GY|1ru|9s|q5o|-ctf4|j6449v
Leticia|leticia||CO|2q|19yv|-wf0|-ezs1|j64mmz
Letpadan|letpadan|letpandan|MM|5y|3s8r|3t7f|kiqv|j64ipj
Levin|levin||NZ|11c|f32|-8pd8|11kg4|j64n4l
Lewiston|lewiston||US|10z|18ig|9ga7|-f1s9|j649al
Lewiston|lewiston||US|ph|1215|9y5i|-p2wm|j64jtj
Lexington|lexington||US|u3|5o5e|85lg|-i408|j64jw1
Lezhë|lezhe||AL|ye|efb|8yfs|47ng|j63ywz
Lgov|lgov||RU|wd|i4s|b2vo|7k6g|j64c1b
Lhasa|lhasa||CN|1v3|4pfz|6cqq|jixk|j64mjj
Lhokseumawe|lhokseumawe||ID|7|309u|1422|ktjr|j64kk5
Lianxian|lianxian|lianzhou|CN|m6|4d4n|5b7r|o35d|j64dyh
Lianyungang|lianyungang||CN|r3|fc5s|7ez8|pjis|j64ex3
Liaocheng|liaocheng||CN|1js|4v3m|7t3k|outw|j64evt
Liaoyang|liaoyang||CN|yg|h0nk|8uj7|qeg5|j64jll
Liaoyuan|liaoyuan||CN|r8|auus|970o|qtic|j64jmz
Libenge|libenge||CD|1x0|kvh|s8s|3zo8|j64ect
Liberec|liberec||CZ|yh|26u7|avz4|38cw|j646hl
Liberia|liberia||CR|m4|z0k|2a1u|-ib7h|j64e6v
Libertador General San Martín|libertador general san martin||AR|rg|120j|-53sj|-dvx8|j64hgj
Librazhd|librazhd||AL|ig|9sj|8twg|4d5f|j63ytx
Libreville|libreville||GA|iy|ce3w|2z2|20z8|j64mkh
Lichinga|lichinga||MZ|16h|2cr3|-2umg|7jww|j64kc7
Lida|lida||BY|op|25bs|bjt1|5f3i|j64i3x
Liège|liege||BE|yj|g20m|aunw|1720|j6488d
Liepaga|liepaga|liepaja|LV|yk|1tos|c418|4i44|j64j4h
Liestal|liestal||CH|70|9wg|a6dq|1np6|j63wcl
Ligonha|ligonha||MZ|165|2p8|-393h|837c|j64bl5
Lihue|lihue||US|ns|bzk|4plz|-y5pq|j648cz
Lijiang|lijiang||CN|1vt|e8d|5qsg|lhnu|j64jkn
Likasi|likasi||CD|tl|9b6w|-2cn8|5qmw|j64kp5
Lille|lille||FR|185|mdk0|autz|nr1|j64jq3
Lillehammer|lillehammer||NO|1ac|f2u|d3ph|290o|j64kbj
Lillooet|lillooet||CA|9r|28d|av2t|-q4ud|j64h17
Lilongwe|lilongwe||MW|ym|dv1a|-2zw9|78o9|j64mkb
Lima|lima||PE|yn|4rq3k|-2ky5|-gijc|j64n13
Lima|lima||US|19y|1gr0|8qdh|-i0yl|j6493p
Limbe|limbe||CM|1mq|4jy2|v3k|1yws|j64h8v
Limeira|limeira||BR|1nj|67i9|-4tzr|-a5qo|j64hj7
Limerick|limerick||IE|yq|1xhi|bad3|-1uja|j64kjh
Limoges|limoges||FR|yr|39fr|9tmk|9n8|j64jq1
Limón|limon|puerto limon|CR|yt|1tl5|255s|-hsot|j64lqh
Linares|linares||CL|12t|1qif|-7ojk|-fce4|j646yb
Linares|linares||ES|31|1a41|85up|-s1a|j643ep
Linares|linares||MX|19c|18jn|5bto|-lcac|j64cwz
Linchuan|linchuan||CN|r4|561c|5ztj|oxu8|j64ew5
Lincoln|lincoln||US|16q|59zg|8qyw|-kpzk|j64jul
Lincoln|lincoln||AR|e4|j4u|-7h4w|-d6uf|j647sx
Linden|linden||GY|1ry|yhe|1a7w|-chm4|j64j1p
Lindi|lindi||TZ|yu|wc8|-255s|8ibs|j64kid
Linfen|linfen||CN|1ju|hvio|7qev|nwh9|j64jjf
Lingyuan|lingyuan|lianyungang|CN|yg|h9ww|8u83|plag|j64kof
Linhai|linhai||CN|1wg|5e9b|66lw|pykg|j646lp
Linhares|linhares||BR|iu|292r|-45m4|-8l10|j64kyd
Linjiang|linjiang||CN|r8|1t23|8yt7|r7g0|j64ez5
Linköping|linkoping||SE|1xa|22n0|cip0|3cln|j64k85
Linkou|linkou||CN|nw|1nzu|9peb|rx13|j646ox
Linqing|linqing||CN|nu|2cwu|7wc8|oslc|j64etn
Linxi|linxi|linxi town|CN|16t|iv|9bs3|par1|j64f0b
Linxia|linxia|linxia city|CN|kc|bggr|7mow|m4ao|j6469h
Linyi|linyi|linyi shandong|CN|1js|18mhc|7ioz|pd0w|j64lsv
Linz|linz||AT|19m|7hex|acu0|3294|j64i2t
Lipetsk|lipetsk||RU|yv|b1vr|ba0o|8hv4|j64kel
Lira|lira||UG|yw|2wid|hfw|71s4|j64am1
Lisala|lisala||CD|1x0|1i2v|gig|4lz0|j64kmz
Lisbon|lisbon||PT|yx|1o9r4|8asv|-1yks|j64muh
Lisburn|lisburn||GB|hl|9yb|book|-1fgs|j64ad1
Lishui|lishui||CN|1wg|3pbd|63iw|pp5k|j64ex7
Lismore|lismore||AU|176|o92|-66cn|wutf|j64k5j
Lithgow|lithgow||AU|176|8l4|-76gh|w6l4|j64ibz
Little Current|little current|northeastern manitoulin and the islands|CA|1aa|18b|9uom|-hk79|j64h2x
Little Rock|little rock||US|49|5t0t|7g0x|-jsfj|j64iy7
Liuhe|liuhe||CN|r8|1h6y|9285|qy1h|j64eyn
Liupanshui|liupanshui|lupanshui|CN|mg|q64o|5p7w|mgvu|j64lp7
Liuzhou|liuzhou||CN|m7|w33c|57cz|neyp|j64jgf
Liverpool|liverpool||GB|139|hdrs|bg6b|-mj3|j64j2b
Liverpool|liverpool||CA|193|3cb|9ftc|-dvds|j647nl
Livingston|livingston||GT|qj|b2m|3e5f|-j0ui|j646qh
Livny|livny||RU|1aj|14tv|b8ig|825o|j64c27
Livorno|livorno||IT|1qi|3cky|9c1j|27hr|j64dqv
Ljubljana|ljubljana||SI|1aw|6qwn|9vd5|33zy|j64lg5
Llallagua|llallagua||BO|1dv|lnp|-3y4o|-ea74|j6485b
Llica|llica||BO|1du|fd|-495s|-emmc|j64hvl
Lobamba|lobamba||SZ|11p|7jq|-5o7v|6oqo|j64j1j
Lobatse|lobatse||BW|1lx|1hv0|-5elg|5i5c|j64i6h
Lobito|lobito||AO|7u|4gfw|-2ng4|2whg|j64l3h
Lobos|lobos||AR|e4|e3q|-7jhl|-cnz7|j64hef
Lodja|lodja||CD|tb|1gno|-qxc|50pk|j64fa5
Lodwar|lodwar||KE|1fx|fln|o5k|7mgk|j64b9d
Łódź|lodz||PL|107|g8vk|b3ih|462m|j64kht
Loei|loei||TH|z1|r7t|3qyv|lsyr|j649xv
Logan|logan||US|1s7|1jxm|8y1b|-nyww|j648m7
Logashkino|logashkino||RU|1hd|0|f6oo|wzi0|j64cpp
Logroño|logrono||ES|x7|32vm|93pc|-ir0|j64a8v
Loikaw|loikaw||MM|tp|dcd|47qi|ku1o|j63zn3
Loja|loja||EC|z5|2pi8|-usc|-gz6s|j64kmn
Lokhwabe|lokhwabe|lokgwabe|BW|u9|14x|-56hs|4ofw|j64i4t
Lokoja|lokoja||NG|ve|1aqr|1o6s|1g07|j64dab
Lokossa|lokossa||BJ|145|1v3v|1f1i|d8e|j63zgf
Lomé|lome||TG|121|v4dc|1bbv|9f4|j64m9z
Loncoche|loncoche||CL|x1|c12|-8fs4|-fkf0|j646vz
London|london||GB|1us|53mc8|b1e3|-wz|j64n2x
London|london||CA|1aa|7fkd|97k4|-hexg|j647kv
London|london||US|u3|61w|7yhl|-i0si|j642r1
Londonderry/Derry|londonderry derry|londonderry|GB|gc|1sjo|bsdw|-1kl1|j64acx
Londrina|londrina||BR|1bw|b5f2|-4zs8|-aywo|j64kxj
Long Beach|long beach||US|bb|17n3a|78pa|-pbpo|j64ixj
Long Xuyen|long xuyen||VN|2u|7i28|283g|mlfc|j64a0n
Longjiang|longjiang||CN|nw|2a34|a5a4|qego|j64f2d
Longreach|longreach||AU|1f2|28e|-50xs|ux1g|j64ijn
Longview|longview||US|1ph|1mkw|6yrx|-kb0r|j641yv
Longview|longview||US|1u8|1f3r|9w0b|-qcl6|j648eb
Longxi|longxi||CN|kc|7ly5|7ifg|mfei|j64duj
Longyan|longyan||CN|ju|7vvc|5eak|p30c|j64dwf
Lonquimay|lonquimay||CL|x0|7wd|-88jx|-f9n1|j646wb
Lop Buri|lop buri|lopburi,thahanbok lop buri|TH|z8|18kh|3688|lkdm|j649ux
Lorca|lorca||ES|1fr|1ug7|82t2|-d3t|j64a85
Lorengau|lorengau||PG|11o|4ha|-fog|vkf4|j63vz3
Loreto|loreto||MX|62|8nv|5kpx|-nv71|j645qv
Lorica|lorica|santa cruz de lorica|CO|fn|14pv|1zb7|-g900|j64e5j
Lorient|lorient||FR|9o|1tjs|a8g0|-pz6|j64fn3
Los Alamos|los alamos||US|175|9ft|7oxr|-ms75|j64ju5
Los Andes|los andes||CL|1sl|17vf|-71bc|-f4r4|j64fs7
Los Angeles|los angeles|los angeles long beach santa ana|US|bb|7fx28|7aa7|-pbwb|j64n2p
Los Angeles|los angeles||CL|aw|342f|-811k|-fic0|j64lwl
Los Blancos|los blancos||AR|1hk|vt|-523g|-df0w|j64hgx
Los Lagos|los lagos||CL|ze|9vx|-8jhb|-flyk|j64fsp
Los Mochis|los mochis||MX|1kj|5c5z|5izw|-nd1s|j64je3
Los Teques|los teques||VE|gt|6i5q|28eg|-ed4o|j6437n
Lota|lota||CL|aw|12eb|-7y6o|-foi8|j64fsv
Louang Namtha|louang namtha|luang namtha|LA|zi|2hl|4hng|lqjb|j63y71
Louangphrabang|louangphrabang|luang prabang|LA|zj|2ao6|49fh|lw4o|j64dhn
Loubomo|loubomo|dolisie|CG|17e|285y|-w90|2prg|j64gh5
Louga|louga||SN|zk|1tn7|3cg8|-3hdw|j64b6h
Louisville|louisville||US|u3|kbhc|86ym|-idnm|j64jvz
Lovec|lovec|lovech|BG|zn|wkj|98us|5aqe|j63zjj
Lowell|lowell||US|12j|fict|94yp|-faa7|j648wj
Lower Hutt|lower hutt||NZ|1ua|270g|-8txh|11hmr|j64n6h
Luan|luan|liuan,lu an|CN|36|1080g|6t03|oyr1|j64jgv
Luan Chau|luan chau||VN|1t6|5nr|4nqw|m5ee|j63ta3
Luanda|luanda||AO|zq|32vfo|-1w6j|2u3p|j64mzx
Luangwa|luangwa||MZ|1pf|2d5|-3cis|6in8|j64bjl
Luanshya|luanshya||ZM|eu|39a1|-2tc5|634w|j64jzf
Luba|luba||GQ|8b|6of|qmc|1tz0|j63x6f
Lubango|lubango||AO|p3|2oxs|-371o|2w38|j64m4d
Lubao|lubao||CD|tb|x8c|-15l4|5ios|j64f9t
Lubbock|lubbock||US|1ph|4kl0|773s|-lu40|j64iyx
Lübeck|lubeck||DE|1ja|51mm|bjo0|2abw|j64elz
Lublin|lublin||PL|zs|7pt8|azg8|4u67|j64dg7
Lubumbashi|lubumbashi|lumumbashi|CD|tl|sz7k|-2i3x|5w0t|j64mk7
Lubutu|lubutu||CD|11j|10h|-5nl|5p49|j64f9j
Lucapa|lucapa||AO|zy|ny9|-1sys|4g14|j64hrh
Lucea|lucea||JM|nd|4up|3yb2|-gr8e|j63wzj
Lucknow|lucknow||IN|1sa|1lrh4|5r8a|hcbv|j64lz7
Lüderitz|luderitz||NA|t0|boh|-5pm8|38yy|j64lnf
Ludhiana|ludhiana||IN|1ei|zcdk|6mnl|g9f3|j64lyx
Luebo|luebo||CD|ta|r5b|-159z|4l78|j64f83
Luena|luena||AO|14t|gaj|-2iz0|49js|j64l3l
Lufkin|lufkin||US|1ph|xds|6pt4|-kaxl|j648tp
Luga|luga||RU|ya|uya|cl7n|6e8m|j64byd
Luganville|luganville||VU|1ii|ac5|-3bp2|ztxy|j64a6j
Luhansk|luhansk|luhans k|UA|zw|9ork|aerm|8fi8|j649pd
Luiana|luiana||AO|fb|46|-3q0v|4xgw|j64htb
Luján|lujan||AR|e4|1r2t|-7etg|-co3g|j64hf1
Lukulu|lukulu||ZM|1un|2l1|-3314|4zbk|j64a4d
Luleå|lulea||SE|18b|11j2|e25a|4qz4|j64lef
Lüleburgaz|luleburgaz||TR|v3|1y4z|8vhv|5v2o|j644f7
Lumbala Nguimbo|lumbala nguimbo|lumbala ngimbo|AO|14t|p|-30sk|4lfk|j64hud
Lumberton|lumberton||US|18e|pap|7f6o|-gxnr|j642sv
Lumphat|lumphat||KH|1gp|eth|2w7y|mxgy|j63zez
Lundazi|lundazi||ZM|hz|8z7|-2mtr|73xw|j64a37
Luohe|luohe||CN|nx|8y18|7710|ofv0|j646kt
Luoyang|luoyang||CN|nx|10raw|7flv|o3t5|j64jlj
Lusaka|lusaka||ZM|100|sgow|-3axv|627y|j64maz
Lusambo|lusambo||CD|tb|vyg|-12cg|50sc|j64f9x
Lusanga|lusanga||CD|6i|4x|-172t|3jfz|j64f7d
Lushnjë|lushnje||AL|jg|vzx|8rw8|484o|j63yoj
Luton|luton||GB|101|522e|b4b8|-38o|j64aix
Lutselke|lutselke|lutselk e|CA|18z|2u|ddhd|-nqf9|j647jf
Lutsk|lutsk|kovel|UA|1to|4kv1|avkg|5fh2|j649nz
Luuq|luuq||SO|kk|q3g|tbp|94bg|j64bw7
Luwuk|luwuk||ID|1mw|10v6|-790|qbgc|j64dnt
Luxembourg|luxembourg||LU|102|2arg|amt1|1bas|j64j45
Luxor|luxor||EG|1eu|d23k|5iaw|6zxg|j64mjb
Luzern|luzern|lucerne|CH|zv|5cwg|a31k|1rw0|j649hd
Luzhou|luzhou||CN|1k9|wxyg|66ur|ml3p|j64jkh
Lviv|lviv|l viv,lvov|UA|wx|h8a0|aoj2|55f0|j64lcb
Lynchburg|lynchburg||US|1tg|285x|80oo|-gyo1|j64jwj
Lynn Lake|lynn lake||CA|11m|de|c6no|-lnpg|j64k1d
Lyon|lyon||FR|1fv|uhzs|9t6g|1195|j64mil
Lysychansk|lysychansk||UA|zw|2o05|ahh0|88ia|j649p7
M'sila|m sila||DZ|108|37qo|7ngo|z2i|j63zi3
Ma'an|ma an||JO|10c|12um|6gyo|7nqo|j63wo1
Maanshan|maanshan|ma anshan|CN|36|ta8u|6su0|pe74|j64dxl
Mabaruma|mabaruma||GY|6v|2ak|1r9s|-ct9k|j64k1v
Macaé|macae||BR|1g1|32d1|-4soo|-8ygc|j647g5
Macapá|macapa||BR|2o|ap5q|96|-axwk|j64moh
Macas|macas||EC|14m|i9z|-htk|-gqs0|j64e45
Macau|macau||MO||c6t8|4rbi|oc4a|j64l5p
Maceió|maceio||BR|24|pf4g|-227o|-7npj|j64m13
Macenta|macenta||GN|19j|x9a|1tz4|-215c|j64gj1
Machakos|machakos||KE|hz|33tp|-bnb|7zi0|j64b8v
Machala|machala||EC|ib|4kdm|-p5k|-h4z4|j64kml
Macheng|macheng||CN|ox|2pi6|6ol4|onks|j64jjt
Machilipatnam|machilipatnam||IN|33|44sb|3h04|hee0|j64fih
Machinga|machinga||MW|10e|13e|-37hf|7m1r|j63xdp
Machiques|machiques||VE|1wr|1cl4|25pc|-fjsr|j648vx
Macia|macia||MZ|kh|hv8|-5d1v|73bo|j64blx
Mackay|mackay||AU|1f2|1mky|-4j5b|vyuk|j64k73
Macon|macon||US|kn|2h6w|71h4|-hxak|j648zf
Madang|madang||PG|10f|1buv|-14bc|v8vx|j64kd3
Madaoua|madaoua||NE|1o2|j50|30m2|19z6|j64ax1
Madinat ath Thawrah|madinat ath thawrah|al thawrah|SY|3u|1vt4|7oin|89ft|j643gl
Madingou|madingou||CG|97|hk8|-w4o|2wl0|j63y0p
Madison|madison||US|1uw|70nr|98cq|-j5tn|j64izv
Madisonville|madisonville||US|u3|h7a|8027|-ir66|j642rd
Madiun|madiun||ID|qw|3zlf|-1mwq|nwge|j64e1j
Madrid|madrid||ES|eo|3bbiw|8nqs|-sfp|j64n0v
Madurai|madurai||IN|1of|rqgg|24k4|gqrh|j64mmj
Mae Sot|mae sot||TH|1o8|zbp|3kze|l4ks|j649uj
Maebashi|maebashi||JP|mi|7e3r|7st3|tt3b|j646ph
Mafetang|mafetang|mafeteng|LS|10l|180z|-6e2e|5u9g|j64kvd
Magadan|magadan||RU|10n|21iq|crom|wbno|j64mfx
Magangué|magangue||CO|8y|25eh|1z7w|-g0p4|j646ed
Magdagachi|magdagachi||RU|2t|923|bgf8|qyog|j64jap
Magdalena|magdalena|magdalena de kino|MX|1la|i0v|6k8m|-nsv8|j645sz
Magdalena|magdalena||BO|ia|2np|-2ubd|-dq8g|j64hcb
Magdeburg|magdeburg||DE|1gz|4xc2|b68o|2hns|j64eo7
Magelang|magelang||ID|qv|2e05|-1lmw|nm5k|j64dzt
Magnitogorsk|magnitogorsk||RU|d0|8uxz|bg7n|cn3c|j64liv
Magong|magong|makung|TW|1cc|17jn|51ub|pmpl|j64m7v
Magta Lajar|magta lajar|magta lahjar|MR|9i|a|3n6c|-2w60|j64d41
Magway|magway||MM|10r|2p79|4bfp|kcek|j64k7n
Maha Sarakham|maha sarakham||TH|10s|13sw|3gvk|m51w|j63v6p
Mahabad|mahabad||IR|1ub|3hc2|7vq0|9ss0|j64g7n
Mahajanga|mahajanga||MG|10u|3bc1|-3cws|9xlm|j64lpv
Mahalapye|mahalapye||BW|cb|135k|-4y8o|5qy0|j64m51
Mahdia|mahdia||TN|10x|zh5|7lsn|2d6x|j63t7t
Mahilyow|mahilyow|mogilev|BY|10y|7wvk|bjvt|6hzj|j64i3j
Mahmud-E Eraqi|mahmud e eraqi|mahmud i raqi|AF|su|5pr|7i6v|euz9|j63z9j
Maiduguri|maiduguri||NG|94|j7cw|2jg7|2tj1|j64lmj
Maintirano|maintirano||MG|10u|4kl|-3vei|9fmv|j64klh
Mainz|mainz||DE|1ft|3yqt|apo1|1ru4|j640lt
Maiquetía|maiquetia||VE|1so|6rea|29sk|-ecqs|j6499h
Maitland|maitland||AU|176|edd|-70h6|whem|j64icd
Maitri Station|maitri station|maitri|AQ||1t|-f65q|2iih|j64ivt
Maizuru|maizuru||JP|wl|1zch|7ljc|t08l|j64f5f
Majene|majene||ID|1mu|5u61|-r9k|phy4|j64e2t
Majuro|majuro||MH||jlk|1it2|10qdk|j64l53
Makale|makale||ID|1mv|7oo|-nw8|posj|j64e2b
Makamba|makamba||BI|110|f5m|-vw5|6dxs|j63zqt
Makarov|makarov||RU|1he|553|af9d|uluo|j64csh
Makassar|makassar|kota makassar,ujung pandang|ID|1mv|r1rk|-13n8|plj1|j64mij
Makeni|makeni||SL|18s|1vnj|1wis|-2kz8|j64b65
Makhachkala|makhachkala|machackala|RU|fr|bw85|97mw|a6ig|j64j8d
Makhambet|makhambet||KZ|54|6vd|a7u2|b1zq|j64g15
Makinsk|makinsk||KZ|3q|hrg|ba6c|f3ac|j64g21
Makiyivka|makiyivka|makiivka|UA|h6|82le|aall|850i|j6440b
Makkah|makkah|mecca|SA|111|too8|4ldc|8j8l|j64mun
Makokou|makokou||GA|19s|d66|4dj|2ra2|j64ffx
Makoua|makoua||CG|fj|8rf|-2o|3cog|j64ggt
Makurdi|makurdi||NG|7x|69t1|1nn8|1ttg|j64lmn
Malabo|malabo||GQ|8a|3ccb|sxo|1vrt|j64mj7
Malacca|malacca|melaka,melaka city|MY|136|gwki|h0w|lwxt|j64kkf
Maladzyechna|maladzyechna|maladziecna|BY|13n|265w|bn4k|5ral|j6487p
Málaga|malaga||ES|31|bsfe|7vc4|-y3s|j649ch
Malakal|malakal||SS|1rw|3g1p|21l5|6s9c|j64lfv
Malang|malang||ID|qw|h954|-1pk4|o4w1|j64lq5
Malanje|malanje|malange|AO|112|2p40|-21m0|3i2w|j64m47
Malargüe|malargue||AR|138|953|-7lnp|-ewwp|j64haz
Malatya|malatya||TR|113|9w5i|882g|87iw|j64afb
Malayer|malayer||IR|n8|3s8t|7ctc|agxg|j6470v
Maldonado|maldonado||UY|115|16t2|-7hd8|-bs2o|j6412j
Malé|male||MV||2f4v|w5f|fr4n|j64msh
Malegaon|malegaon||IN|10w|et24|4en8|fz1e|j64fkv
Mali|mali||GN|xd|487|2l8o|-2mwy|j63ycx
Malindi|malindi||KE|ea|20jk|-oro|8lew|j64kl1
Mallawi|mallawi||EG|1t|4npx|5xyw|6lyo|j64egx
Malmö|malmo||SE|1kw|5rtx|bwvt|2skd|j64lnv
Maltahöhe|maltahohe||NA|nf|1sp|-5bo0|3mpk|j64khz
Mamou|mamou||GN|119|1iwh|283g|-2ld4|j64gij
Man|man||CI|gw|35em|1l3o|-1m98|j64gjj
Manacapuru|manacapuru||BR|2q|19lq|-pds|-czqw|j64glz
Manado|manado||ID|1my|9ool|bf4|qrck|j64kj3
Managua|managua||NI|11b|jpvk|2lse|-iho0|j64mcf
Manama|manama||BH||c34g|5mft|auav|j64m7n
Mananjary|mananjary||MG|jf|ld2|-4jpj|acxx|j64klf
Manaus|manaus||BR|2q|11kmg|-nwl|-cuz8|j64mn1
Manbij|manbij||SY|2a|2kq1|7tua|84vf|j643hf
Manchester|manchester||GB|11d|1bsog|bgts|-hcz|j64l6n
Manchester|manchester||US|172|47o6|97rc|-fbcp|j648wt
Mandalay|mandalay||MM|11e|rv34|4pjb|kldr|j64m6v
Mandalgovi|mandalgovi||MN|hk|2aw|9t0c|mryc|j64jfl
Mandali|mandali||IQ|gx|mzd|78d8|9rfs|j6471f
Mandeville|mandeville||JM|11d|10cr|3v56|-glzs|j63wzz
Mandritsara|mandritsara||MG|10u|7hl|-3e60|ago6|j64bod
Mandurah|mandurah||AU|1uo|1klo|-6yyb|ot3z|j64m5b
Mandya|mandya||IN|t6|63xm|2ozs|ghio|j64fjv
Manga|manga||BF|1wo|bph|2hzg|-87u|j63zzj
Mangai|mangai||CD|6i|sp0|-v64|46p0|j64f7h
Mangaluru|mangaluru|mangalore|IN|t6|gn94|2rjc|g1jo|j64lvj
Mango|mango||TG|1j7|ww2|27xo|3ms|j649dv
Mangochi|mangochi||MW|11h|23e7|-33kk|7k58|j64btd
Mangyshlak|mangyshlak|aktau|KZ|11g|35rn|9d49|aym1|j640rf
Manhattan|manhattan||US|sr|17xx|8ef8|-kpb8|j641qt
Manica|manica||MZ|11i|334|-42dc|71pc|j64bjp
Manicoré|manicore||BR|2q|gml|-18ui|-d4z3|j64kvn
Manila|manila||PH|13c|6lwtc|34p9|pxhn|j64n1h
Manily|manily||RU|sf|a|den0|zfgo|j64jfx
Manisa|manisa||TR|11l|588z|8a2o|5vq8|j64af1
Manizales|manizales||CO|ba|8208|131k|-g6ps|j64lqn
Manja|manja||MG|1qc|16o|-4ldl|9i2t|j64bp3
Manjimup|manjimup||AU|1uo|39s|-7c59|ow7w|j64k4p
Mankato|mankato||US|13m|17gl|9gro|-k5aw|j6414t
Mannheim|mannheim||DE|5r|1emj4|aly4|1tcs|j64ekl
Manokwari|manokwari||ID|q4|1lhk|-6pz|sqhh|j64kpj
Manono|manono||CD|tl|zkv|-1kbs|5vt0|j64kp7
Manpo|manpo||KP|cl|405n|8tha|r2i6|j6465p
Mansa|mansa||ZM|zr|wmd|-2ef4|66x0|j64jz7
Mansa Konko|mansa konko||GM|zo|eeo|2v7x|-3cz6|j63xxt
Mansehra|mansehra||PK|15m|1fau|7cze|fosg|j6456p
Mansfield|mansfield||US|19y|1o08|8qhr|-hooz|j642tl
Manta|manta||EC|11a|3xby|-7k8|-hax0|j64kmp
Manukau|manukau|manukau city,southern auckland|NZ|55|81tc|-7xhs|11hf6|j64n61
Manyoni|manyoni||TZ|1km|8m|-18lg|7hag|j64asj
Manzanillo|manzanillo||CU|lv|2qws|4cz2|-gj1a|j64e7v
Manzanillo|manzanillo||MX|ef|2dfz|42zk|-mcyn|j64jeb
Manzhouli|manzhouli|manchouli|CN|16t|208k|amps|p63g|j64jnl
Manzini|manzini||SZ|11p|2dah|-5ofq|6q6w|j63v9z
Mao|mao||DO|1sm|119l|46v4|-f8f2|j63x4x
Mao|mao||TD|sn|dwv|30y2|3a5p|j64kn7
Maoming|maoming||CN|m6|q3lf|4p50|nrh8|j64dyp
Mapai|mapai||MZ|kh|5l|-4w97|6umn|j64bm5
Maputo|maputo||MZ|11q|uzqo|-5k99|6zg0|j64me3
Maqat|maqat|makat|KZ|54|av6|a7nm|bfgx|j64625
Mar de Ajó|mar de ajo||AR|e4|ai2|-7vay|-c5bi|j64heb
Mar del Plata|mar del plata||AR|e4|bwxl|-857k|-ccag|j64mpp
Marabá|maraba||BR|1bz|3k86|-15a4|-aizc|j64mn7
Maracaibo|maracaibo||VE|1wr|18erk|2at3|-fcy3|j64mth
Maracaju|maracaju||BR|12r|hia|-4mqs|-btrs|j6475f
Maracay|maracay||VE|3y|ll08|272w|-ehl6|j64jx1
Maradah|maradah|marada|LY|y|1xg|69kh|449y|j64de3
Maragheh|maragheh||IR|hs|38t5|80qk|9wmw|j64g7x
Maralal|maralal||KE|1fx|g2x|8kh|7v0w|j64b93
Marambio Base|marambio base|marambio station,vicecomodoro marambio base|AQ||46|-drmh|-c544|j64iu5
Marathon|marathon||CA|1aa|3kj|ag5s|-iier|j64h3f
Marbella|marbella||ES|31|3zmb|7tri|-11oh|j643e5
Mardan|mardan||PK|15m|6ft4|7bw0|ffv4|j6457b
Mardin|mardin||TR|11y|1j2l|7zwb|8qdf|j64akf
María Elena|maria elena||CL|3d|1tu|-4sgc|-exks|j646uv
Marib|marib|ma rib|YE|10b|cyi|3azm|9pss|j640bd
Maribor|maribor||SI|120|2g50|9z3x|3cr8|j64axf
Maridi|maridi||SS|1ug|az4|11xb|6bg2|j64a93
Mariehamn|mariehamn||AX|jj|88q|cvpm|49xe|j63y4n
Mariental|mariental||NA|nf|abo|-59ys|3ukv|j64djz
Mariestad|mariestad||SE|1tz|bhn|ckyy|2yp4|j63we3
Marietta|marietta||US|kn|1bcg|7a04|-i4c8|j642ij
Mariinsk|mariinsk||RU|u0|x9u|c1q4|it5w|j64ch7
Marília|marilia||BR|1nj|4jqy|-4rdg|-apf0|j6481t
Marinette|marinette||US|1uw|kyp|9nzw|-is5t|j6495x
Maringá|maringa||BR|1bw|71cf|-50mn|-b4p0|j64gt1
Marion|marion||US|pv|tjt|8oy7|-icy8|j642ph
Mariscal Estigarribia|mariscal estigarribia|mariscal jose f estigarribia|PY|90|1xg|-4pzg|-czo4|j640eb
Mariupol|mariupol||UA|h6|abmi|a3ea|81sa|j64jyf
Marka|marka|merca|SO|1jo|1ie|dpi|9m39|j64kdp
Markala|markala||ML|1nk|15gq|2xhc|-1au4|j64d67
Maroantsetra|maroantsetra||MG|1q4|tcu|-3b31|anqt|j64kll
Maroua|maroua||CM|j1|6uv9|29r8|32j3|j64mq1
Marovoay|marovoay||MG|10u|o45|-3g83|9ztp|j64bol
Marquette|marquette||US|13e|kin|9z5n|-iqfm|j649c3
Marrakesh|marrakesh|marrakech|MA|126|iou8|6s2n|-1pqr|j64mdv
Marrupa|marrupa||MZ|16h|6re|-2tu8|81cj|j64bkx
Marsabit|marsabit||KE|hz|cp8|hz8|8520|j64kjx
Marsala|marsala||IT|1ka|1o0o|83pi|2nz7|j64dsd
Marseille|marseille|marseille aix en provence|FR|1eb|u08w|9a1j|15gj|j64lw5
Martapura|martapura||ID|s8|48yn|-qc7|om31|j64kmh
Marv Dasht|marv dasht|marvdasht|IR|j9|2og8|6dy6|bbkn|j646zz
Mary|mary||TM|128|3tw4|824g|d93x|j64lcx
Maryborough|maryborough||AU|1f2|fye|-5h4z|wqeh|j64k6t
Maryborough|maryborough||AU|1t8|5fq|-7xvk|ut10|j64ihf
Marzuq|marzuq|murzuk|LY|158|16hr|5jvo|2z8c|j64ksd
Masaka|masaka||UG|12b|1efx|-2jk|6stw|j64apn
Masasi|masasi||TZ|151|rsw|-2asg|8bdr|j64as1
Masaya|masaya||NI|12c|2se9|2kcq|-igba|j640g1
Mascara|mascara||DZ|12d|2bie|7l5g|12w|j64i05
Maseru|maseru||LS|12e|7qss|-6a7j|5w29|j64mi7
Mashhad|mashhad||IR|1fn|1gx3c|7rvk|crmp|j64myl
Masindi|masindi||UG|12h|oam|cx4|6spq|j63u1l
Masindi-Port|masindi port||UG|12h|6f3|d4c|6vgb|j64am5
Masjed Soleyman|masjed soleyman||IR|un|3akf|6urc|akef|j6470d
Mason City|mason city||US|q1|lga|98z8|-jz54|j648ox
Massangena|massangena||MZ|kh|i2|-4m6l|72ak|j64bm1
Massawa|massawa||ER|g4|3204|3cg5|8gec|j64ek1
Masterton|masterton||NZ|11c|fl4|-8rxb|11nag|j64n4j
Masvingo|masvingo||ZW|12k|1mvr|-4as4|6lt4|j64a5v
Matadi|matadi||CD|6y|59pi|-18vq|2vs4|j64mk3
Matagalpa|matagalpa||NI|12n|2c69|2ro3|-iexr|j64b5f
Matagami|matagami||CA|1fa|1im|anvk|-gn0t|j64h61
Matanzas|matanzas||CU|12o|357x|4xsf|-hhgf|j64ec3
Matara|matara||LK|12p|1gno|19wi|h9h0|j64ahj
Mataram|mataram||ID|19f|apch|-1u77|ow3q|j64dnf
Mataró|mataro||ES|c3|3xfh|8wiw|iwk|j643ft
Matehuala|matehuala||MX|1i2|1g91|52kc|-lkmc|j64cx3
Mathura|mathura||IN|1sa|730v|5w6w|gnb0|j6472p
Matočkin Šar|matockin sar|matochkin shar|RU|4a|a|fpcs|c3kh|j64j6b
Matola|matola||MZ|11q|bnoj|-5kds|6ygo|j64bv1
Matruh|matruh|marsa matruh,mersa matruh|EG|12s|27u6|6pwg|5u3w|j64eg5
Matsue|matsue||JP|1k0|3czv|7lny|siqy|j64ext
Matsumoto|matsumoto||JP|15p|4tjy|7rms|tkl0|j64f4f
Matsuyama|matsuyama||JP|i7|bfol|795j|sgfe|j64jnb
Maturín|maturin||VE|143|8t3w|238c|-djf8|j64j01
Maués|maues||BR|2q|p4h|-q5k|-cddc|j64gm3
Maumere|maumere||ID|19g|28gt|-1ui5|q6zv|j64e21
Maun|maun||BW|18q|12jd|-4a8o|50pk|j64i5l
Mavinga|mavinga||AO|fb|n5c|-3dtz|4d3k|j64ht1
Mawlamyine|mawlamyine|moulmein|MM|142|9eml|3jbg|kxmk|j64iq5
Mawson Station|mawson station||AQ||1o|-ehpt|dh5a|j64iv5
Maxixe|maxixe||MZ|px|2kho|-545g|7l26|j64btl
May Pen|may pen||JM|e7|2w9y|3umq|-gjxp|j646cz
Mayagüez|mayaguez||PR||68sr|3wfz|-ee1x|j64isp
Mayda Shahr|mayda shahr|maidan shar|AF|1u6|r0g|7dtg|eqv4|j63zbd
Maydh|maydh||||n5c|2cq1|a3en|j64itd
Maykop|maykop|majkop|RU|k|3e9f|9k7o|8lkg|j64595
Mayumba|mayumba||GA|19h|330|-qd2|2a6c|j64kqd
Mazabuka|mazabuka||ZM|1m0|1ddy|-3edk|5y74|j64jzn
Mazar-i-Sharif|mazar i sharif|mazar e sharif|AF|69|9tif|7v6g|edqw|j64m41
Mazatenango|mazatenango||GT|1mj|1dvw|3448|-jm3g|j64fcx
Mazatlán|mazatlan|mazatan|MX|1la|apsw|67wb|-nlsl|j64cw3
Mazatlán|mazatlan|juarez|MX|1kj|7w3w|4z6b|-mt54|j64mg3
Mazowe|mazowe||ZW|12f|7ou|-3r6k|6mys|j64a4p
Mazyr|mazyr||BY|oi|2eix|b5l8|69v6|j64i3f
Mbabane|mbabane||SZ|o5|1xju|-5n27|6o85|j64let
Mbaïki|mbaiki||CF|z0|1fss|tv4|3uw0|j64dph
Mbala|mbala||ZM|18s|fve|-1w7k|6q1w|j64jzd
Mbale|mbale||UG|a7|8mgw|8ew|7bno|j64amb
Mbalmayo|mbalmayo||CM|ce|1pvy|r5w|2gqg|j64hm1
Mbamba Bay|mbamba bay||TZ|1gk|6xx|-2f25|7g9e|j64asf
Mbandaka|mbandaka||CD|1x0|5w6s|b4|3ww8|j64lqx
Mbanza-Congo|mbanza congo|m banza kongo|AO|1w0|1afq|-1cdk|31vk|j64hs7
Mbanza-Ngungu|mbanza ngungu|nkamba|CD|6y|48fd|-14i8|36ns|j64f8v
Mbarara|mbarara||UG|td|1sl0|-4mk|6khw|j64aqj
Mbe|mbe||CM|181|31q|1oko|2wxs|j64hnf
Mbeya|mbeya||TZ|12x|691d|-1wlg|75y4|j64mgv
Mbombela|mbombela||ZA|150|7gmi|-5giw|6n1k|j64bmj
Mbuji-Mayi|mbuji mayi||CD|tb|rr88|-1bft|5231|j64lul
Mbulu|mbulu||TZ|4f|ad2|-tpc|7m5g|j64at5
McAlester|mcalester||US|1a3|gpw|7hjm|-kixo|j641ux
McAllen|mcallen||US|1ph|7sv8|5m6m|-l1y1|j641zf
McCook|mccook||US|16q|66k|8m88|-lkfq|j648q5
McGrath|mcgrath||US|26|3u|dhs0|-xcl2|j649jt
Mchinji|mchinji||MW|12z|e4h|-2yhc|71uw|j63xep
McMinns Lagoon|mcminns lagoon||AU|18x|3vl|-2opd|s36s|j64i6x
McMurdo Station|mcmurdo station||AQ||rs|-gnsb|zrkm|j64iuv
Meadow Lake|meadow lake||CA|1j3|4je|blo5|-n8or|j64gz5
Meander River|meander river||CA|29|5k|cni5|-p81q|j647il
Medan|medan||ID|1n1|19by0|rmz|l569|j64mvf
Medani|medani|wad madani|SD|ko|74q2|3340|76n4|j64kan
Médéa|medea||DZ|15g|35yz|7rv4|ldg|j64i11
Medellín|medellin||CO|3c|1ynzc|1cfl|-g75m|j64mwf
Medenine|medenine||TN|10a|1bm1|75ps|28dj|j63t4d
Medford|medford||US|1ai|2bql|92le|-qc3s|j64ixx
Medicine Hat|medicine hat||CA|29|1cpu|aq25|-nq1d|j64kz1
Medina|medina|al madinah|SA|1p|lnbk|5923|8hdx|j64lfn
Medinipur|medinipur||IN|1ud|3mhz|4saw|iogc|j64gct
Mednogorsk|mednogorsk||RU|1ak|no4|b0r3|cca3|j64cc7
Meekatharra|meekatharra||AU|1uo|i6|-5p8w|pe81|j64k4l
Meerut|meerut||IN|1sa|typc|67s8|gnit|j64l8d
Megion|megion||RU|ue|11kj|d35c|gb5l|j64cet
Mehtar Lam|mehtar lam|mihtarlam|AF|xh|ddt|7fd0|f1er|j63z9z
Meiganga|meiganga||CM|d|1pt0|1eb9|329g|j64hmt
Meizhou|meizhou||CN|m6|8w5u|57i5|ovzk|j64dxz
Mejillones|mejillones||CL|3d|1kp|-4y8o|-f3lg|j64kqx
Mékambo|mekambo||GA|19r|2g2|7uj|2zid|j64fft
Mekele|mekele|mek ele|ET|1pv|21yo|2w60|8gjw|j64lxp
Meknes|meknes||MA|135|eyak|79ks|-16wg|j64brp
Mekoryuk|mekoryuk||US|26|2r|cxym|-zmbv|j643l7
Melbourne|melbourne||AU|1t8|2hdlc|-83t1|v2mb|j64n2l
Melbourne|melbourne||US|jl|5osm|60ox|-h9z7|j642ch
Melekeok|melekeok||PW||5f6|1lru|sus9|j64l5d
Melilla|melilla||ES|137|3118|7kdk|-mrg|j64k9z
Melitopol|melitopol||UA|1wb|3dww|a1ei|7kz3|j649pp
Melo|melo||UY|cg|16ti|-6xor|-bm20|j648av
Melton|melton||AU|1t8|oz4|-82tb|uzic|j64iib
Melun|melun||FR|1x2|5cgo|aehh|kkq|j646u1
Melut|melut||SS|1rw|4xz|28i9|6wgg|j64a9d
Melville|melville||CA|1j3|3av|ax05|-m17k|j647hd
Memphis|memphis||US|1pd|n63s|7j03|-jagj|j64m9l
Ménaka|menaka||ML|ke|712|3etb|iio|j64kqp
Mendefera|mendefera||ER|10k|5ilq|36v0|8bib|j64ek5
Mendi|mendi||PG|1m2|k98|-1bes|usdg|j64bpp
Mendocino|mendocino||US|bb|f8|8fau|-qj8q|j641dn
Mendoza|mendoza||AR|138|j51k|-71pq|-er0a|j64mph
Mengzi|mengzi|mengzi city|CN|1vt|6i25|509f|m5vx|j646kb
Meningie|meningie||AU|1lj|15p|-7ngj|tv3p|j64iet
Menkere|menkere||RU|1hd|a|eklq|qfs1|j64jcd
Menongue|menongue||AO|fb|a1y|-3562|3sko|j64mqh
Merauke|merauke||ID|1br|qjw|-1tj8|u3ci|j64kjf
Merced|merced||US|bb|2257|7ztu|-ptn7|j648gx
Mercedes|mercedes||AR|e4|14ut|-7ffs|-cqn4|j647sv
Mercedes|mercedes|villa mercedes|AR|1i1|122p|-77y8|-e164|j64hfx
Mercedes|mercedes||UY|1lc|won|-74mr|-cfrg|j648ap
Mercedes|mercedes||AR|f2|nnd|-695g|-cg5c|j64hi7
Mereeg|mereeg|mareeg|SO|k6|f8|t2a|a4yw|j64kfv
Mérida|merida||MX|1vq|kolk|4hsm|-j7i2|j64mgh
Mérida|merida||VE|15h|7ekx|1stc|-f8uc|j64lav
Mérida|merida||ES|j0|14g7|8c8w|-1cwk|j63vdx
Meridian|meridian||US|13t|wmq|6xq2|-j0fw|j642k3
Merimbula|merimbula||AU|176|4wv|-7wpw|w4mw|j64i9x
Merowe|merowe||SD|18s|7wa|3ym9|6thz|j64kaz
Merredin|merredin||AU|1uo|224|-6qx8|pcjv|j64i8b
Meru|meru||KE|hz|10fu|go|82fk|j64lof
Mesa|mesa||US|48|n9hu|75wf|-ny5t|j641bz
Messina|messina||IT|1ka|5egq|86r9|3bzg|j64ds7
Metairie|metairie||US|zl|8g66|6fcv|-jbmg|j641x5
Metz|metz||FR|zc|8rqa|aj0j|1boo|j64fqp
Mexicali|mexicali||MX|61|iyvc|6zxz|-or2c|j64lln
Mexico City|mexico city|ciudad de m|MX|gu|bbu3k|4618|-l8wx|j64n37
Meymaneh|meymaneh|maymana|AF|ja|4a5v|7p8m|dvrp|j64hp7
Mezen|mezen||RU|4a|2u0|e44a|9hcw|j64ke5
Miahuatlán|miahuatlan|miahuatlan de porfirio diaz|MX|19l|dls|3i04|-kpdc|j645vz
Miami|miami||US|jl|3bpew|5izs|-h711|j64n0f
Miami Beach|miami beach||US|jl|8qme|5j5f|-h6au|j642e5
Miandrivazo|miandrivazo||MG|1qc|fx3|-46l6|9qtm|j64bp7
Mianyang|mianyang|mianyang sichuan|CN|1k9|tx5s|6qu7|mge8|j64lsb
Miaoli|miaoli|miaoli city|TW|13d|37qo|59l0|pw94|j64iwx
Miass|miass||RU|d0|3l8s|bsci|cvp1|j64c7x
Michurinsk|michurinsk||RU|1oe|2057|bc6g|8oi0|j645gx
Middelburg|middelburg||ZA|150|3bde|-5irg|6be4|j64bmt
Middelburg|middelburg||NL|1wd|zv9|b1e4|rus|j63vmv
Middelburg|middelburg||ZA|i0|e0k|-6r20|5cz8|j64lhp
Middlesbrough|middlesbrough||GB|1mf|8x0q|bp58|-9ho|j64ac3
Midland|midland||US|1ph|2405|6v5f|-lvsf|j648vd
Miercurea Cuic|miercurea cuic|miercurea ciuc|RO|ng|wfh|9xq2|5gy0|j63urt
Mikhalkino|mikhalkino||RU|vq|fu|evok|ylzv|j645ad
Mikhaylova|mikhaylova||RU|1p3|a|g3fq|in5s|j64ja5
Mikhaylovka|mikhaylovka||RU|1tl|19g2|aqbr|99gv|j64c3t
Mikkeli|mikkeli||FI|1m4|zx2|d804|5uj6|j63y5z
Mikumi|mikumi||TZ|14l|cy4|-1l3g|7xc8|j64aqt
Milagro|milagro||EC|mb|2cuq|-gtg|-h274|j64e3j
Milan|milan||IT|z6|1r4dk|9qv3|1z0f|j64mvn
Mildura|mildura||AU|1t8|10xn|-7bru|ugui|j64k5x
Miles City|miles city||US|147|6nb|9y3d|-moo0|j648c7
Millerovo|millerovo||RU|1gg|tq7|ahlv|8npi|j64c2v
Milwaukee|milwaukee||US|1uw|tqzk|987m|-iuer|j64m9p
Minas|minas||UY|y2|vrw|-7d78|-bu5o|j64121
Minatitlán|minatitlan||MX|1sy|4bse|3uql|-k9ec|j64d21
Mindelo|mindelo||CV||1ihf|3m9y|-5cwg|j64itz
Mineiros|mineiros||BR|l8|u1z|-3rkf|-b9k0|j64hdh
Mingan|mingan||CA|1fa|gc|as4q|-dpyl|j64l0x
Minna|minna||NG|17l|698h|2288|1ejg|j64khj
Minneapolis|minneapolis|minneapolis st paul|US|13m|1k2io|9n2z|-jzjt|j64msz
Minot|minot||US|18f|ufj|ac5x|-lplq|j64l91
Minsk|minsk||BY|13n|12oqw|bjwr|5wov|j64mr1
Minxian|minxian|min county|CN|kc|1gc2|7dpm|mape|j64dux
Miracema|miracema||BR|1g1|kl8|-4l78|-91m8|j647gb
Mirbat|mirbat||OM|gi|v4|3n44|bq06|j64cih
Miri|miri||MY|1j1|4w38|xy7|ofid|j64bhz
Mirny|mirny|mirnyy|RU|1hd|v3o|dek8|ofby|j64llb
Mirny Station|mirny station||AQ||4p|-e9p7|jxn3|j64iv3
Mirpur Khas|mirpur khas|mirput khas|PK|1kk|7n0z|5h06|eshy|j64j51
Mirzapur|mirzapur||IN|1sa|59o9|5e0u|hp44|j64gbd
Mishan|mishan||CN|nw|1vbt|9rgw|s9lc|j64f2p
Miskolc|miskolc||HU|95|5b65|ab58|4gc8|j64anb
Misrata|misrata|misratah|LY|13s|89xk|6xug|38ig|j64lxd
Missoula|missoula||US|147|1k7s|a1o2|-ofkr|j64l8z
Mistassini|mistassini|mistissini|CA|1fa|21h|at0r|-ftyi|j64h5n
Mitchell|mitchell||US|1ln|bqd|9dav|-l0di|j648s1
Mitilini|mitilini|mytilene|GR|1tq|mmo|8ds0|5owa|j64fup
Mitla|mitla||MX|19l|5tn|3mj6|-knts|j64d01
Mito|mito||JP|pd|7l2c|7smw|u3y8|j64f5n
Mitú|mitu||CO|1st|4kd|98v|-f1go|j64miz
Mityana|mityana||UG|ak|vqj|338|6vas|j64alt
Mitzik|mitzik|mitzic|GA|1uy|367|61p|2h8y|j64fg1
Miyazaki|miyazaki||JP|13w|6yao|6ua6|s614|j64lt5
Mizdah|mizdah|mizda|LY|13x|k57|6qjl|2s6h|j64ddd
Mkokotoni|mkokotoni||TZ|tg|1zg|-19d2|8exk|j63wbp
Mmabatho|mmabatho|mmabatho mafikeng|ZA|18n|28ks|-5jb0|5hlw|j64kcj
Mo i Rana|mo i rana||NO|188|fqx|e7pa|31b7|j64j31
Moab|moab||US|1s7|4f6|89mx|-nhac|j648mp
Moanda|moanda||CD|6y|3arf|-19p9|2nby|j64f8h
Moanda|moanda||GA|no|n9j|-c2v|2tuo|j64fmh
Moatize|moatize||MZ|1pf|weo|-3g83|79yk|j64bjh
Moba|moba||CD|tl|7py|-1ih0|6dbk|j64fat
Mobaye|mobaye||CF|74|ezr|xc0|4jfc|j640sd
Mobile|mobile||US|23|5fkq|6kq8|-ivec|j64izb
Mobridge|mobridge||US|1ln|2fo|9re1|-liyj|j648sb
Moca|moca||DO|it|1bpm|45o2|-f45q|j63xof
Mocambique|mocambique|island of mozambique|MZ|165|15wr|-381r|8pwm|j64kcd
Moçâmedes|mocamedes|namibe|AO|163|2ujo|-397g|2lts|j64m4f
Mochudi|mochudi||BW|ua|ums|-583e|5lsg|j640tl
Mocimboa|mocimboa|mocimboa da praia|MZ|b3|lj9|-2fcc|8ncc|j64bkt
Mocoa|mocoa||CO|1el|h03|8vg|-gfa4|j646dl
Mocuba|mocuba||MZ|1w3|1h88|-3m0g|877s|j64bt3
Modena|modena||IT|ih|3rf2|9kis|2c9c|j6467b
Modesto|modesto||US|bb|6xiy|82ju|-pxkc|j648hj
Moengo|moengo||SR|125|5zq|17fw|-bntw|j6439p
Mogadishu|mogadishu|muqdisho|SO|6h|nkrk|fym|9q1b|j64mez
Mogocha|mogocha||RU|dl|9rb|bilx|po4i|j64jb1
Mohales Hoek|mohales hoek|mohale s hoek|LS|13z|ja8|-6gpi|5w1c|j63wsl
Mohembo|mohembo|mohembo west|BW|18q|l1|-3x78|4o7k|j64i5h
Mojokerto|mojokerto||ID|qw|2eul|-1lmw|o3ik|j64e1f
Mokhotlong|mokhotlong||LS|140|6sp|-6a0e|68d8|j63wuv
Mokpo|mokpo||KR|ml|5r3m|7gkk|r39y|j64cjz
Molde|molde||NO|15k|eci|dg63|1jfd|j64kbh
Molepolole|molepolole||BW|wk|1csw|-589s|5gu4|j64l4x
Mollendo|mollendo||PE|44|11u1|-3nbs|-ffpk|j644t7
Mombasa|mombasa||KE|ea|iwk0|-v5p|8i8g|j64mi5
Monaco|monaco||MC||s2b|9dhw|1l5h|j64l5h
Monastir|monastir||TN|144|1j7e|7np7|2b2x|j63t8d
Monchegorsk|monchegorsk||RU|157|12h8|ek57|71b3|j64bxd
Monclova|monclova||MX|e9|52ac|5rk8|-lqk8|j64kh5
Moncton|moncton||CA|171|1xxn|9vkx|-dvqr|j64l1b
Mongbwalu|mongbwalu||CD|1an|26b|f1s|6fql|j64ej5
Mongo|mongo||TD|mk|lf7|2m0d|40ag|j64een
Mongu|mongu||ZM|1un|14ja|-39wc|4ye8|j64a3z
Monroe|monroe||US|zl|26ho|6yug|-jqso|j648sj
Monrovia|monrovia||LR|14b|mb8o|1cq2|-2bbx|j64mvj
Mons|mons||BE|n3|1yfh|at8s|ue6|j63yyp
Mont-Laurier|mont laurier||CA|1fa|8ze|9z6o|-g6k8|j64h65
Montana|montana||BG|147|10lx|9azg|4zaq|j63zjx
Montana|montana||US|26|a|db0d|-w5yw|j643rt
Monte Cristi|monte cristi||DO|148|d49|49am|-fcus|j64fd1
Monte Plata|monte plata||DO|149|bzg|4146|-eygg|j63xt5
Monte Quemado|monte quemado||AR|1iv|8sb|-5j2k|-dh2y|j64hhn
Montego Bay|montego bay||JM|1h7|2p88|3yhn|-gp7j|j64jht
Montemorelos|montemorelos||MX|19c|wwg|5ed8|-ledc|j645tj
Montepuez|montepuez||MZ|b3|1jrr|-2t8c|8cxc|j64bkn
Monterey|monterey||US|bb|2nwg|7uer|-q4jc|j64ju1
Montería|monteria||CO|fn|5wce|1vkn|-g9kk|j64jhf
Montero|montero||BO|1in|1wdk|-3pvc|-dk48|j64hw5
Monterrey|monterrey||MX|19c|27k74|5i33|-li5z|j64n1j
Montes Claros|montes claros||BR|13l|74gr|-3l0g|-9efc|j64m0j
Montevideo|montevideo||UY|14a|wffs|-7gy9|-c1fm|j64m85
Montgomery|montgomery||US|23|4911|6xpc|-ihqg|j64laz
Monticello|monticello||US|1s7|1fs|847y|-nfou|j648mj
Montpelier|montpelier||US|1t0|6l6|9hig|-fjzy|j642av
Montpelier|montpelier||US|ph|2b9|92ka|-nurt|j648dd
Montpellier|montpellier||FR|xv|70ie|9ci0|tv0|j64fob
Montréal|montreal||CA|1fa|26tyo|9r3f|-frsc|j64mzl
Montrose|montrose||US|ei|gt9|88w5|-n4an|j648jn
Monywa|monywa||MM|1h0|4ujy|4qka|ke6k|j64k7t
Moorhead|moorhead||US|13m|rew|a1on|-kqgu|j648bz
Moose Jaw|moose jaw||CA|1j3|oti|asw0|-mmfg|j64kyx
Moosonee|moosonee||CA|1aa|1bx|azom|-had0|j64l0n
Mopipi|mopipi||BW|cb|2jp|-4jf7|5bz4|j64i5z
Mopti|mopti||ML|14c|2boo|33t0|-w94|j64krx
Moquegua|moquegua||PE|14d|162d|-3on0|-f7dk|j64k95
Moradabad|moradabad|muradabad|IN|1sa|gv94|66k5|gvoc|j64l83
Moranbah|moranbah||AU|1f2|7ps|-4prk|vq9o|j64imn
Moratuwa|moratuwa||LK|eg|4abk|1gbg|h4cw|j64aht
Morawa|morawa||AU|1uo|77|-69fn|ov28|j64i81
Moree|moree||AU|176|6bv|-6be3|w43h|j64k5f
Morelia|morelia||MX|13f|dt5e|489i|-los7|j64cyb
Morgantown|morgantown||US|1ul|19dk|8hsa|-h4y1|j64965
Morioka|morioka||JP|qi|6br8|8ihc|u8ys|j64jot
Morogoro|morogoro||TZ|14l|5dli|-1gmg|82l4|j64lnl
Morombe|morombe||MG|1qc|cwn|-4nqn|9am1|j64klp
Morón|moron||CU|e1|1ez0|4qln|-guoz|j64e7l
Mörön|moron||MN|pa|ld6|an2d|lgso|j64jff
Morondava|morondava||MG|1qc|seb|-4ci9|9hox|j64klv
Moroni|moroni||KM||2ray|-2ib6|99n6|j64l5n
Moroto|moroto|moroto town|UG|14n|ab|jln|7fa8|j64amn
Morrinhos|morrinhos||BR|l8|qcf|-3st0|-aixo|j647rd
Morshansk|morshansk||RU|1oe|122u|bggj|8ykc|j64c65
Moscow|moscow||RU|14p|680tc|by79|8288|j64n35
Moshi|moshi||TZ|uv|fgca|-pro|8048|j64atj
Moss|moss||NO|1ww|sh1|cqma|2abo|j64bbl
Mossel Bay|mossel bay||ZA|1up|cx3|-7bno|4qr8|j64kc3
Mossendjo|mossendjo||CG|17e|nvc|-mok|2q5c|j64gh1
Mossoró|mossoro||BR|1fz|4cbb|-141o|-8048|j64kyh
Mostaganem|mostaganem||DZ|14q|41c2|7pbg|p0|j64i0b
Mostar|mostar||BA|o2|3htn|9aht|3ti0|j64i1f
Mosul|mosul|al mawsil|IQ|17p|s7fk|7sgd|98w7|j64lxj
Motul|motul||MX|1vq|ged|4it4|-j4w0|j645zv
Motupe|motupe||PE|xp|ak1|-1bgc|-h31o|j644t1
Mouila|mouila||GA|17b|lls|-eee|2d07|j64fm7
Moundou|moundou||TD|z4|3cwx|1tz0|3g5g|j64lqz
Mount Barker|mount barker||AU|1uo|1dh|-7f88|p7x6|j64i8f
Mount Gambier|mount gambier||AU|1lj|hwp|-83wp|u65e|j64k5p
Mount Isa|mount isa||AU|1f2|pm8|-4fwn|twb8|j64m6f
Mount Magnet|mount magnet||AU|1uo|bs|-60k6|p92v|j64i7x
Mountain Village|mountain village||US|26|kz|db1z|-z3ca|j643od
Moyeni|moyeni|quthing|LS|1f9|ima|-6ini|5xuw|j63wtf
Moyobamba|moyobamba|mayobamba|PE|1i5|10ty|-1aog|-ghvn|j64b0v
Mozdok|mozdok||RU|18l|z9i|9dlz|9kk0|j6459b
Mozhga|mozhga||RU|1rm|10h2|c3lw|b6nn|j64cb5
Mpanda|mpanda||TZ|1gh|1kl6|-1d2k|6nl0|j64ao5
Mpigi|mpigi||UG|14z|8ju|1qi|6xc0|j63tyj
Mpika|mpika||ZM|18s|ly5|-2ja4|6qqw|j64jzb
Mpwapwa|mpwapwa||TZ|h3|fa6|-1czs|7thc|j64arn
Mt.  Hagen|mt hagen|mount hagen|PG|1ur|19ko|-198o|uws8|j64lh5
Mt. Shasta|mt shasta|mount shasta|US|bb|2z3|8ur4|-q7qu|j648il
Mtsensk|mtsensk||RU|1aj|10qh|bezr|7u00|j64c2d
Mtwara|mtwara||TZ|151|22je|-278o|8m3w|j64as5
Muar|muar||MY|rd|43n6|fox|lzeq|j64bgt
Mubende|mubende||UG|152|em0|4k0|6q1w|j64aln
Mubi|mubi||NG|e|4u5l|278v|2ue4|j64dbt
Muconda|muconda||AO|zz|1sk|-29sc|4ki8|j64hrn
Mudangiang|mudangiang|mudanjiang|CN|nw|qnvk|9jyi|rrwp|j64jo3
Mudgee|mudgee||AU|176|45r|-6zgo|w261|j64icl
Mudon|mudon||MM|142|39ik|3hh6|ky0v|j64ipx
Mufulira|mufulira||ZM|eu|3ajc|-2ou4|6220|j64ld7
Muğla|mugla||TR|154|116f|7z5w|62uv|j644g5
Muglad|muglad|mujlad|SD|1lt|ffh|2d4x|5xzp|j64av7
Muisne|muisne||EC|is|ac1|4pg|-h5fs|j646c7
Mukhomornoye|mukhomornoye||RU|dw|2s|e8h7|115g5|j64bwh
Mulhouse|mulhouse||FR|2f|4m8u|a8g0|1kpo|j64fqh
Multan|multan||PK|1ei|wmds|6h1f|fbc3|j64md3
Mumbai|mumbai||IN|10w|bario|42r1|fm5i|j64n3v
Mumbwa|mumbwa||ZM|cb|eq6|-37l0|5svg|j64a2p
Munchon|munchon||KP|so|1ksz|8fv9|r9vp|j64655
Muncie|muncie||US|pv|1txl|8m4y|-iaug|j6492l
Mundybash|mundybash||RU|u0|4j2|ber1|ipqn|j645lf
Munich|munich||DE|7i|rbso|abdz|2haq|j64mwt
Münster|munster||DE|189|5sh4|b508|1mso|j64ekf
Muramvya|muramvya||BI|155|dx5|-p5u|6chk|j6404j
Murcia|murcia||ES|1fr|8pw7|8520|-8pw|j64j1v
Murfreesboro|murfreesboro||US|1pd|2hby|7ol8|-iilb|j6493z
Muriaé|muriae||BR|13l|1ycl|-4j1g|-9330|j6477d
Murmansk|murmansk||RU|157|6ucf|es6c|73eg|j64meb
Murom|murom||RU|1tj|2tav|bws8|90ds|j64c6f
Muroran|muroran||JP|of|3c4c|92rw|u7t4|j64jo7
Murray Bridge|murray bridge||AU|1lj|e1e|-7j28|tujc|j64igf
Muş|mus||TR|159|1roo|8azm|8w6x|j64agx
Musan|musan|musan county|KP|nb|1pua|91uo|rp5c|j64dij
Muscat|muscat||OM|15a|fqw9|5279|ck3x|j64mf1
Mushie|mushie||CD|6i|pie|-nas|3mk0|j64f7p
Musina|musina||ZA|ys|fkv|-4sdk|6fpo|j64kcv
Muskegon|muskegon||US|13e|262h|99lm|-ihhw|j649b3
Muskogee|muskogee||US|1a3|ubj|7nu2|-kfvi|j648r5
Musoma|musoma||TZ|11r|2uqs|-bhs|78sw|j64atn
Muswellbrook|muswellbrook||AU|176|8z2|-6wzs|wc9w|j64ict
Muyinga|muyinga||BI|15b|1iuc|-m0b|6hxh|j64i6d
Muynoq|muynoq|mo ynoq|UZ|sy|a14|9dpv|cneu|j64j0t
Muzaffarnagar|muzaffarnagar||IN|1sa|7hu2|6bia|gnhy|j64731
Muzaffarpur|muzaffarpur||IN|86|753k|5ljo|iasn|j64gd7
Mwanza|mwanza||TZ|15c|al4o|-jg0|7238|j64lnj
Mwanza|mwanza||MW|15c|8s3|-3chz|7ebz|j63xgn
Mweka|mweka||CD|ta|133n|-11cc|4mfo|j64f7z
Mwene-Ditu|mwene ditu||CD|tb|41yx|-1i0g|50v4|j64kp3
Mwenga|mwenga||CD|1mp|1pk|-nfy|63dx|j64f95
Mwingi|mwingi||KE|hz|8nn|-768|85r0|j64b8l
Mwinilunga|mwinilunga||ZM|18r|ana|-2il0|58kw|j64a3h
Mỹ Tho|my tho||VN|5k|2nsf|27v4|mslo|j64a1h
Myeik|myeik||MM|1oj|5psw|2o3h|l4w3|j64l4z
Myingyan|myingyan||MM|11e|3iec|4llm|kg1m|j64ipf
Myitkyina|myitkyina||MM|rw|2zbw|5foc|kvhk|j64k7p
Mykolayiv|mykolayiv|mykolaiv|UA|15d|ay60|a2el|6usj|j643vv
Mymensingh|mymensingh||BD|ge|72q6|5az4|jddk|j64hr3
Myrtle Beach|myrtle beach||US|1ll|1231|77y1|-gwp2|j64jvp
Mys Shmidta|mys shmidta||RU|dw|do|erw9|-12h14|j64bwv
Mysuru|mysuru|mysore|IN|t6|j0ew|2mzz|gfhx|j64lvl
Mzimba|mzimba||MW|15e|ewc|-2jtk|779c|j63xd5
Mzuzu|mzuzu||MW|15e|2d15|-2gfc|7ai0|j64luv
N'Délé|n dele|ndele|CF|6e|92s|1svv|4fcy|j64mp1
N'Djamena|n djamena|n djamnna,ndjamena|TD|mz|l748|2lha|383s|j64mj3
Nabatiye et Tahta|nabatiye et tahta|nabatieh|LB|2v|1pq8|75l5|7lj8|j63y45
Naberezhnyye Chelny|naberezhnyye chelny|naberezhnye chelny|RU|1p0|9vry|bxs8|b7pb|j645kd
Nabeul|nabeul||TN|15n|2gul|7tbv|2ask|j649ev
Nabire|nabire||ID|1br|xve|-puz|t1mm|j64kjd
Nablus|nablus||PS||4mnh|6wmf|7k0w|j64itt
Nacala|nacala||MZ|165|4tgb|-340y|8q5q|j64mdd
Nacaome|nacaome||HN|1sh|109k|2wec|-ir2s|j6448f
Nacogdoches|nacogdoches||US|1ph|noj|6rut|-kad5|j648sv
Nacozari de García|nacozari de garcia|nacozari viejo|MX|1la|95s|6iq0|-ni2c|j645t5
Ñacunday|nacunday||PY|2k|yq|-5krs|-bqlv|j644yp
Nadym|nadym||RU|1v9|zr7|e1mq|fjj0|j64j75
Naga|naga||PH|be|fw8z|2x34|qeh2|j64kgl
Nagano|nagano||JP|15p|cqkn|7usk|tm4k|j64lu1
Nagaoka|nagaoka||JP|17m|46pi|80yw|trg8|j64f61
Nagasaki|nagasaki||JP|15q|9bzz|70te|ru76|j64mjx
Nagchu|nagchu|nagchu town|CN|1v3|1xg|6qwg|jq9g|j64jij
Nagercoil|nagercoil||IN|1of|4t3d|1r4c|glgc|j64gez
Nagoya|nagoya||JP|u|1x8a8|7j9t|tcfe|j64ltz
Nagpur|nagpur||IN|10w|1glio|4jd3|gy8w|j64myd
Nagua|nagua||DO|12a|q4m|45i8|-eyxy|j63xtl
Naha|naha||JP|1a2|jehi|5m7s|rd4q|j64lt7
Nain|nain||CA|179|vz|c4bm|-d7z0|j64mox
Nairobi|nairobi||KE|15s|1sij4|-9vy|7w2b|j64n3h
Naivasha|naivasha||KE|1fx|xxr|-5h4|7t3g|j64b9v
Najaf|najaf|an najaf|IQ|2x|e9jk|6uwz|9i3e|j64lxl
Najran|najran||SA|15t|7x6x|3r2x|9gis|j6453b
Nakasongola|nakasongola||UG|15u|5c9|a3l|6yfo|j63u0h
Nakhodka|nakhodka||RU|1v9|3f3z|eirk|gm5c|j64c8t
Nakhodka|nakhodka||RU|1e5|3f3z|96ja|shd6|j64jbb
Nakhon Nayok|nakhon nayok||TH|15v|gfx|31kg|lozk|j63v13
Nakhon Pathom|nakhon pathom||TH|15w|2izr|2ymc|lg3k|j63v25
Nakhon Ratchasima|nakhon ratchasima||TH|15x|76h4|37qo|lvt4|j64lep
Nakhon Sawan|nakhon sawan||TH|15y|2ecr|3d54|lg58|j64k8p
Nakhon Si Thammarat|nakhon si thammarat||TH|15z|4z9r|1stc|lfdg|j64k8j
Nakuru|nakuru||KE|1fx|7tfb|-25s|7qbg|j64kk1
Nalchik|nalchik|naltchik|RU|rs|6lju|9bmt|9ck3|j64lht
Nalut|nalut||LY|kp|1fe9|6tzo|2cn8|j64dc7
Nam Định|nam dinh||VN|160|57n6|4dk8|mrg0|j64j1d
Namanga|namanga||KE|1fx|a6h|-jlg|7vy8|j64b9p
Namangan|namangan||UZ|161|g2pc|8scw|fd0c|j64j0z
Nampo|nampo|n ampo,nampho|KP|164|o5lk|8b55|qvzd|j64jex
Nampula|nampula||MZ|165|8bse|-38sg|8f6q|j64lgx
Namsos|namsos||NO|186|6yz|dtk1|2gqg|j64j4f
Namtu|namtu||MM|1jr|11hr|4y45|kvjk|j64irn
Namur|namur||BE|166|2a0c|atfk|11ks|j64hnx
Nan|nan||TH|167|1rn7|40yk|llk3|j649tn
Nanaimo|nanaimo||CA|9r|1tih|aj7o|-qka7|j64h0h
Nancha|nancha||CN|nw|2lnb|a3pg|rpkr|j64f3j
Nanchang|nanchang||CN|r4|1ed9s|65b7|ou4d|j64mxj
Nanchong|nanchong||CN|1k9|1algw|6lio|mqw1|j64l6z
Nancy|nancy||FR|zc|5rjk|afn9|1bu8|j64fql
Nanded|nanded||IN|10w|dd98|43x0|gkg8|j64lvt
Nandi|nandi|nadi|FJ|1un|wmk|-3tcc|120ye|j64fll
Nandyal|nandyal||IN|33|41ke|3br8|gtk0|j64fhp
Nangong|nangong||CN|nu|1rki|80co|oq78|j64etj
Nanjing|nanjing|nanjing jiangsu|CN|r3|26uqg|6vbc|pghw|j64mxl
Nanning|nanning||CN|m7|1ag2g|4w3f|n7sd|j64mvv
Nanping|nanping||CN|ju|4ke6|5phc|pbt0|j64dx1
Nantes|nantes||FR|1c6|9edl|a4a0|-c9o|j64fnj
Nantong|nantong||CN|r3|kapk|6v5v|pw9z|j64jmn
Nantou|nantou|nantou city|TW|16b|3jbc|54jj|pv75|j648a5
Nanuque|nanuque||BR|13l|t6o|-3tnk|-8ncc|j6476p
Nanyang|nanyang|nanyang henan|CN|nx|15o00|72nb|o49t|j64l73
Nanyuki|nanyuki||KE|1fx|rvy|5o|7xyg|j64b8z
Napier|napier||NZ|l0|18lk|-8gpg|11x69|j64n5z
Naples|naples||IT|bg|1c840|8r50|31wf|j64mvl
Naples|naples||US|jl|5mea|5lpp|-hj4u|j648xx
Nara|nara||ML|6d|e8r|394o|-1k68|j64krt
Narathiwat|narathiwat||TH|16d|1gk0|1dmm|ltnq|j64a0b
Narayanganj|narayanganj||BD|ge|4sjq|5298|jeaw|j64hrf
Narrabri|narrabri||AU|176|5gq|-6i1j|w3rm|j64idf
Narrogin|narrogin||AU|1uo|39q|-7241|p42a|j64i8n
Narsarsuaq|narsarsuaq||GL|vj|41|d3yq|-9qfq|j64lwn
Narvik|narvik||NO|188|ffk|ennc|3pes|j64j33
Naryan Mar|naryan mar|nar yan mar|RU|16v|gpm|ehyy|bde6|j64kf5
Naryn|naryn||KG|16g|14cs|8vnb|gacn|j6456b
Nasca|nasca||PE|pf|i6c|-36fg|-g28o|j64k9t
Nashville|nashville|nashville davidson|US|1pd|isp4|7r3r|-ilm3|j64m9j
Nasik|nasik|nashik|IN|10w|vkko|4ac8|ft9w|j64l7v
Nasir|nasir||SS|1rw|1cd|1ud0|7356|j64a9h
Nassau|nassau||BS||4vvo|5djm|-gku4|j64msn
Nata|nata||BW|cb|3p6|-4bxr|5m30|j64i5v
Natal|natal||BR|1fz|nbi8|-18l1|-7jxf|j64m1d
Natal|natal||BR|2q|l0mk|-1hvy|-cx1n|j64kw7
Natara|natara||RU|1hd|a|enuy|qk7r|j64cqn
Natashquan|natashquan||CA|1fa|k2|ara1|-d8xn|j647mb
Natchez|natchez||US|13t|iev|6rh8|-jl5f|j6490h
National City|national city||US|bb|37qo|703j|-p3j8|j641db
Natitingou|natitingou||BJ|4w|1qf0|27ms|aq4|j64hz1
Naujaat|naujaat|repulse bay|CA|19e|rs|e9cf|-ihrh|j64mo5
Nauta|nauta||PE|za|1xg|-z9g|-ftag|j644v7
Nautla|nautla||MX|1sy|28a|4bzq|-kqsa|j645z7
Navajoa|navajoa|navojoa|MX|1la|2hkt|5syr|-ngk2|j64cvv
Navoi|navoi|navoiy|UZ|16k|4lrg|8lhs|e0a6|j649rl
Navsari|navsari||IN|fo|3hrs|4gvs|fmnk|j64gfp
Nawabganj|nawabganj||BD|1ff|31uh|59nw|ixpo|j64ip5
Nawabshah|nawabshah||PK|1kk|4x34|5mie|ens0|j64bel
Naxcivan|naxcivan|nakhchivan,naxcivian|AZ|16l|2150|8ejg|9qei|j64i4b
Naypyidaw|naypyidaw|nay pyi taw|MM|11e|jxlc|48j9|kln3|j64mrv
Nazareth|nazareth||IL|my|38v7|70cg|7kcb|j64fwv
Nazran|nazran||RU|pw|2019|99l6|9ljq|j640hl
Nazret|nazret|adama|ET|g|a7z0|1tz0|8f0c|j64ktd
Nazyvayevsk|nazyvayevsk||RU|1a8|9h8|bwra|fajg|j64cf5
Nchelenge|nchelenge||ZM|zr|ia5|-2054|65ok|j64a27
Ndalatando|ndalatando|n dalatando|AO|fc|6a8|-1zr7|371o|j64hrx
Ndende|ndende||GA|17b|4s8|-idx|2fu1|j64fm3
Ndola|ndola||ZM|eu|8htf|-2sb3|652c|j64jzh
Nebbi|nebbi||UG|16p|nf6|j3q|6nzl|j63tzh
Necochea|necochea||AR|e4|1q3i|-89j4|-clbg|j64l27
Needles|needles||US|bb|5dq|7gw4|-okd2|j648hz
Neftekamsk|neftekamsk||RU|72|2pud|c0qr|bmp3|j64c7b
Nefteyugansk|nefteyugansk||RU|ue|2ewo|d3a1|fkz7|j645kx
Negele Boran|negele boran|nagele|ET|g|930|150u|8hfd|j64ktf
Nehe|nehe||CN|nw|2bj1|ae5g|qrkw|j64jo1
Neiafu|neiafu||TO||5pb|-3zwg|-11agp|j64it3
Neiba|neiba||DO|60|jur|3yhm|-fb1y|j646qp
Neijiang|neijiang||CN|1k9|vf68|6c9b|mik1|j64l71
Neiva|neiva||CO|oz|7k9j|mm6|-g592|j64e97
Nekemte|nekemte|nek emte|ET|g|1kca|1y55|7tv8|j64fy7
Nelidovo|nelidovo||RU|1rd|jk5|c1tn|70vn|j64c01
Nellore|nellore||IN|33|ej5g|33f4|h57f|j64kpx
Nelson|nelson||NZ|16u|1aww|-8um6|114sa|j64n5p
Nelson|nelson||CA|9r|937|alth|-p4yp|j64h13
Nelson House|nelson house||CA|11m|1xg|byk5|-l6qc|j64gyb
Nema|nema||MR|od|4abk|3k7v|-1jxw|j64d63
Nenana|nenana||US|26|23|du6e|-vyeq|j643th
Nenjiang|nenjiang||CN|nw|1vb8|ajh4|qua4|j64jnz
Nephi|nephi||US|1s7|3y5|8ien|-nyxf|j641lx
Nerchinsk|nerchinsk||RU|dl|buo|b5ay|ozam|j64cp7
Neryungri|neryungri||RU|1hd|1f68|c5as|qq9s|j64jc1
Neuchâtel|neuchatel||CH|16w|o4m|a2na|1hf2|j63uft
Neumayer Station III|neumayer station iii||AQ||14|-f6zs|-1ohc|j64ivp
Neuquén|neuquen||AR|16y|56ss|-8cjg|-el5k|j64m31
Nevelsk|nevelsk||RU|1he|d48|a06r|ueob|j64csp
Nevers|nevers||FR|9c|zft|a2j1|ofn|j64fon
Nevinnomyssk|nevinnomyssk||RU|1mb|2vos|9kah|8zos|j6459v
Nevşehir|nevsehir||TR|170|1m9z|8a0w|7fxk|j63tot
Nevyansk|nevyansk||RU|1nc|lqi|cbli|cwmc|j64cab
New Albany|new albany||US|pv|2l2p|87lx|-ie79|j642q5
New Amsterdam|new amsterdam||GY|iv|1062|1c84|-cbwk|j64k1x
New Bedford|new bedford||US|12j|2x02|8xf5|-f7ev|j6429h
New Braunfels|new braunfels||US|1ph|zdc|6d5e|-l15b|j6420p
New Delhi|new delhi||IN|g8|6t7p|64og|gjog|j64n1x
New Glasgow|new glasgow||CA|193|foi|9rq1|-dfa5|j647nh
New Haven|new haven||US|er|i5da|8uwo|-fmi0|j648wf
New Iberia|new iberia||US|zl|sys|6fic|-joh3|j641xn
New Liskeard|new liskeard|temiskaming shores|CA|1aa|40j|a6ig|-h2pm|j647l3
New London|new london||US|er|227m|8v3n|-fgbs|j6428d
New Orleans|new orleans||US|zl|gtpk|6fgh|-jarn|j64mtd
New Plymouth|new plymouth||NZ|1on|14ic|-8dcs|11b64|j64n4z
New Taipei|new taipei||TW|177|2bgfg|5d00|q18a|j64l6b
New York|new york|new york city,new york newark|US|178|bc3cw|8qfz|-fuuk|j64n2v
Newark|newark||US|174|6057|8q1o|-fwas|j6496z
Newcastle|newcastle|newcastle upon tyne|GB|1re|iwk0|bsef|-ccz|j64j27
Newcastle|newcastle||AU|176|bla4|-71fp|wjeu|j64mrf
Newcastle Waters|newcastle waters||AU|18x|a|-3rfs|slu8|j64i71
Newhalen|newhalen||US|26|4g|cssz|-x770|j649il
Newman|newman||AU|1uo|3yq|-50aq|pnv9|j64k4j
Newport|newport||US|1fu|zgw|8w54|-fa9a|j648wx
Neyshabur|neyshabur|nishapur|IR|1fn|4r2c|7rh4|cluw|j6471l
Nezahualcoyotl|nezahualcoyotl|ciudad nezahualcoyotl|MX|15i|nrzn|45ro|-l84c|j645yd
Ngaoundéré|ngaoundere||CM|d|4yil|1khg|2ws8|j64hmx
Ngara|ngara||TZ|s2|d16|-j1z|6khw|j64apj
Ngorongoro|ngorongoro||TZ|4f|8d0|-p2o|7m2o|j64asx
Ngozi|ngozi||BI|17c|gle|-mgw|6e4q|j63zr5
Nguigmi|nguigmi|n guigmi|NE|gl|dt5|31z8|2t5w|j64b7v
Nguru|nguru||NG|1vk|2dnq|2rdw|28ms|j64db5
Nha Trang|nha trang||VN|uo|8tk4|2mis|ned0|j64jyv
Niamey|niamey||NE|17d|jm0o|2wb7|gbf|j64mbx
Niamey|niamey|maradi|NE|11s|4zfv|2w3o|1ir8|j64le7
Nice|nice|nice cannes|FR|1eb|jva0|9dbm|1k1j|j64jpx
Nicosia|nicosia||CY||4t2k|7jcj|75gi|j64msp
Nicuadala|nicuadala||MZ|1w3|5cx|-3rv1|7w3p|j64bt7
Nieuw Amsterdam|nieuw amsterdam||SR|el|3t3|19lo|-bsx8|j643a7
Nieuw Nickerie|nieuw nickerie||SR|17g|cc8|19ww|-c7qk|j6498p
Niğde|nigde||TR|17k|1y8v|850w|7fp8|j63tt7
Niigata|niigata||JP|17m|c7np|84lc|tsu8|j64jov
Nikolayevsk|nikolayevsk||RU|1tl|cdo|apxd|9qid|j645fl
Nikolayevsk na Amure|nikolayevsk na amure|nikolayevsk on amur|RU|ub|ky8|be3s|u5vo|j64jd7
Nikolski|nikolski||US|26|i|bch4|-106zp|j649i3
Nikopol|nikopol||UA|h1|2sp0|a70y|7dha|j649oz
Nîmes|nimes||FR|xv|3mtn|9e74|xkc|j64fof
Ninde|ninde|jiaocheng|CN|ju|6qcd|5pv8|pmat|j64dx7
Ningan|ningan|ning an|CN|nw|165o|9i29|rqyr|j64f43
Ningbo|ningbo||CN|1wg|157so|6ekj|q1vd|j64lt1
Ninh Bình|ninh binh||VN|17r|2sph|4ca7|mppi|j649yp
Nioro du Sahel|nioro du sahel||ML|tq|b4l|39io|-21zw|j64d4z
Nipigon|nipigon||CA|1aa|xg|ai7u|-iwxw|j64h4x
Niquelândia|niquelandia||BR|l8|l91|-33nc|-adzw|j64hd3
Niš|nis||RS|17u|5cwg|9ac8|4ozc|j64h9p
Niterói|niteroi||BR|1g1|w5sx|-4wp4|-98k8|j647fx
Nizamabad|nizamabad||IN|1p9|8brt|4028|gqmg|j64fiz
Nizhenvartovsk|nizhenvartovsk|nizhnevartovsk|RU|ue|58zt|d26e|gew8|j64j7v
Nizhnekamsk|nizhnekamsk||RU|1p0|50s9|bxbo|b3ug|j64cdv
Nizhneudinsk|nizhneudinsk||RU|q6|xfi|brld|l83p|j64j9h
Nizhneyansk|nizhneyansk||RU|1hd|b4|fb6l|t5wa|j64mfp
Nizhny Novgorod|nizhny novgorod|gor kiy,nizhniy novgorod,novgorod|RU|17t|re40|c2om|9fhp|j64mef
Nizhny Tagil|nizhny tagil||RU|1nc|862k|ceww|curq|j64lj3
Nizhnyaya Tura|nizhnyaya tura||RU|1nc|179w|ckhw|cten|j64caj
Nizhyn|nizhyn||UA|d2|2hq8|axxp|6u2f|j649nd
Nizwa|nizwa||OM|a|1jm4|4wwg|cbwy|j64kfp
Njombe|njombe|njombe mjini|TZ|q5|101w|-1zzk|7gac|j64art
Nkawkaw|nkawkaw||GH|hz|1ccr|1ejl|-60o|j64ff5
Nkhata Bay|nkhata bay||MW|17v|h24|-2hi4|7cns|j64bsl
Nkhotakota|nkhotakota||MW|17w|1a6m|-2rnv|7cns|j64bsp
Nkongsamba|nkongsamba||CM|yz|2ibr|129w|24p4|j64hlf
Nogales|nogales||MX|1la|3tf5|6pju|-ns22|j64llx
Noginsk|noginsk||RU|14o|4x9f|bz3k|88ww|j64c1z
Noginsk|noginsk||RU|iz|4x9f|dtk1|jjyl|j64j8z
Nogliki|nogliki||RU|1he|7si|b3y5|uooj|j64jdl
Nokaneng|nokaneng||BW|18q|1cz|-47rs|4ru4|j64i5d
Nola|nola||CF|1ie|kop|r9l|3fyy|j64h8z
Nome|nome||US|26|2ot|dtqd|-zga8|j64maf
Nong Khai|nong khai||TH|17x|28mx|3twt|m0t3|j649xz
Nongan|nongan|nong an|CN|r8|3162|9its|qtth|j64eyf
Nonthaburi|nonthaburi||TH|17y|5jhy|2yqp|ljc1|j649vp
Nord|nord||GL|16j|a|hij2|-3tcg|j64jqv
Nordvik|nordvik||RU|1p3|0|fv45|nwf0|j64co5
Norfolk|norfolk||US|1tg|mgjh|7wc4|-gckw|j64m9n
Norfolk|norfolk||US|16q|jba|90an|-kvsw|j648qb
Norilsk|norilsk||RU|1p3|3jzl|ev14|iwqy|j64lkh
Norman|norman||US|1a3|2flh|7jtj|-kv41|j648r1
Norman Wells|norman wells||CA|18z|sj|dzqd|-r6s4|j64h23
Norrköping|norrkoping||SE|1xa|1we7|ck4i|3gu3|j649lz
Norseman|norseman||AU|1uo|rw|-6wgg|q3k2|j64k43
North Battleford|north battleford||CA|1j3|f00|bb5e|-n7ip|j64k1h
North Bay|north bay||CA|1aa|12pm|9x94|-h11g|j64m2d
North Platte|north platte||US|16q|jhb|8ter|-lljt|j648qf
North Shore|north shore|takapuna|NZ|55|4en9|-7vvt|11gku|j64n4p
Northam|northam||AU|1uo|4in|-6s9i|p03q|j64k4t
Norway House|norway house||CA|11m|4mo|bkeq|-kyvx|j64kyl
Norwich|norwich||GB|18a|436s|ba3k|a14|j64ah5
Nottingham|nottingham||GB|191|hp1c|bcpz|-910|j64ajb
Nouadhibou|nouadhibou||MR|fu|1uxe|4h9k|-3nls|j64lwx
Nouakchott|nouakchott||MR|192|fwn4|3vk0|-3f9l|j64mlb
Nouméa|noumea||NC|1ml|1zt0|-4rs1|zoaj|j64jh7
Nouna|nouna||BF|vs|mew|2q7u|-ts8|j63zsx
Nova Cruz|nova cruz||BR|1fz|hvi|-1dx4|-7lgg|j64gxn
Nova Friburgo|nova friburgo||BR|1g1|3opj|-4rrc|-948o|j64k17
Nova Iguaçu|nova iguacu||BR|1g1|i3on|-4vgo|-9bf0|j647fn
Nova Lima|nova lima||BR|13l|1w7j|-4a60|-9eck|j64761
Nova Viçosa|nova vicosa||BR|5z|1770|-3tyo|-8fs4|j64k0v
Novara|novara||IT|1d6|25v2|9qp0|1uig|j6468v
Novi Sad|novi sad||RS|rl|4typ|9p5k|495v|j64ha3
Novo Airão|novo airao||BR|2q|6zd|-k80|-d28u|j64kw1
Novo Hamburgo|novo hamburgo||BR|1g0|isou|-6d8o|-aylk|j64gs3
Novo Horizonte|novo horizonte||BR|1nj|n9q|-4ll0|-ajs8|j64hjz
Novoaltaysk|novoaltaysk||RU|2h|1yii|bg15|hztw|j64cg3
Novocherkassk|novocherkassk||RU|1gg|3ku6|a5w8|8l9c|j645ef
Novokuybishevsk|novokuybishevsk|novokuybyshevsk|RU|1hq|39ji|bdvk|ap6n|j645k5
Novokuznetsk|novokuznetsk||RU|u0|bkdc|biqk|io6m|j64ljj
Novolazarevskaya Station|novolazarevskaya station||AQ||1y|-fa5w|-2jfq|j64ivn
Novomoskovsk|novomoskovsk||RU|1r5|2t2e|bld0|86wo|j645f3
Novorossiysk|novorossiysk||RU|vz|56m8|9l50|83fn|j64kev
Novoshakhtinsk|novoshakhtinsk||RU|1gg|24ra|a8lg|8k0w|j645et
Novosibirsk|novosibirsk||RU|195|trrc|bsmn|hs3x|j64mex
Novotroitsk|novotroitsk||RU|1ak|29xm|az28|ci2s|j645jb
Novozybkov|novozybkov||RU|9y|xla|b9d0|6uhl|j645bd
Novy Port|novy port||RU|1v9|1dq|eid3|fmpv|j64j6v
Novy Urengoy|novy urengoy||RU|1v9|20p0|e5wh|gfb0|j64j73
Novyy Uoyin|novyy uoyin|novy uoyan|RU|af|388|c152|ny57|j64jad
Nowra|nowra||AU|176|214t|-7h5o|wa1c|j64iad
Noyabrsk|noyabrsk||RU|1v9|2dbg|dje9|g7gl|j64j77
Nsukka|nsukka||NG|ik|2dnt|1gzi|1kyy|j64da3
Ntcheu|ntcheu||MW|197|825|-36br|7f8d|j63xf7
Ntungamo|ntungamo||UG|198|cnk|-6sa|6hiq|j63u85
Nueva Gerona|nueva gerona||CU|q8|jq6|4out|-hqw0|j64e63
Nueva Imperial|nueva imperial||CL|x1|ehl|-8ax4|-fmyo|j646vv
Nueva Ocotepeque|nueva ocotepeque||HN|19p|6rw|33ea|-j44s|j63tj7
Nueva Rosita|nueva rosita||MX|e9|s9u|5znw|-lp0o|j645rf
Nueva San Salvador|nueva san salvador|santa tecla|SV|x4|2o7q|2xic|-j4ys|j63ww5
Nueve de Julio|nueve de julio|9 de julio|AR|e4|qse|-7li4|-d1tw|j647tb
Nuevitas|nuevitas||CU|bd|15om|4m8w|-gk6c|j64e7p
Nuevo Casas Grandes|nuevo casas grandes||MX|db|16ay|6ipl|-n4nj|j64cu7
Nuevo Laredo|nuevo laredo||MX|1oc|7hpq|5w6w|-lc4s|j64lm7
Nuku'alofa|nuku alofa|nukualofa|TO||wvw|-4j3t|-11k0e|j64ms3
Nukus|nukus||UZ|sy|4xh2|93p8|crzq|j64lct
Numan|numan||NG|e|1nw1|20zw|2kwg|j64dbx
Numto|numto||RU|ue|a|dn97|faet|j64j7x
Nuquí|nuqui||CO|dp|245|17v8|-gk95|j64ea7
Nur-Sultan|nur sultan|astana|KZ|3q|7eo4|aywz|fb52|j64mlx
Nürnberg|nurnberg|nuremberg|DE|7i|fswo|alk4|2dhs|j64jih
Nuuk|nuuk||GL|vk|bf2|drcv|-b367|j64ml7
Nuussuaq|nuussuaq||GL|1eq|5o|fvx6|-c8c2|j64jqz
Nyac|nyac||US|26|2s|d2pl|-ya3x|j643nl
Nyagan|nyagan||RU|ue|1489|dbix|e0hi|j64j7p
Nyahanga|nyahanga||TZ|15c|cf0|-idx|76vg|j64aon
Nyala|nyala|niyala|SD|1lo|8er9|2l20|5c1w|j64mcl
Nyanza|nyanza||RW|1m0|4trt|-i4o|6dh4|j64avb
Nyeri|nyeri||KE|cb|13f0|-37u|7x46|j63wrl
Nyimba|nyimba||ZM|hz|114|-349j|6lqc|j64a33
Nyingchi|nyingchi||CN|1v3|2s|6bvp|k8iv|j64jil
Nyíregyháza|nyiregyhaza||HU|1nh|3shc|aa3p|4nkz|j644ov
Nyköping|nykoping||SE|1nn|la6|clfc|3nae|j63un7
Nyukzha|nyukzha||RU|2t|a|c474|q2df|j64cp1
Nyunzu|nyunzu||CD|tl|bvp|-19wo|606f|j64faf
Nzega|nzega||TZ|1nt|kig|-whc|740o|j64ap1
Nzérékoré|nzerekore||GN|19j|3lq1|1nvk|-1w4s|j64lzz
Nzeto|nzeto|n zeto|AO|1w0|g8z|-1js8|2r88|j64hsb
Oak Ridge|oak ridge||US|1pd|pw4|7puz|-i289|j6493v
Oakland|oakland||US|bb|wdbz|83fd|-q72b|j64jtv
Oamaru|oamaru||NZ|1ay|a14|-9o2c|10nek|j64n55
Oatlands|oatlands||AU|1oy|w5|-92dw|vl36|j64inp
Oaxaca|oaxaca|oaxaca de juarez|MX|19l|bdig|3nt7|-kpwr|j64lmf
Ob|ob||RU|195|utp|bsd9|hq6d|j64chp
Oban|oban||NZ|1m5|8m|-a1sc|101ky|j64n73
Óbidos|obidos||BR|1bz|lab|-eqk|-bwe8|j64k03
Obihiro|obihiro||JP|of|3q6a|9794|uopg|j64f4t
Obluchye|obluchye||RU|1vi|7ps|ai34|s3g1|j645pp
Obninsk|obninsk||RU|se|2av4|bt04|7uk8|j64c15
Obo|obo||CF|nn|9xz|15o0|5oh4|j64mp5
Obock|obock||DJ|19n|dps|2kdy|99zs|j64ekb
Obuasi|obuasi||GH|4l|3uz9|1brk|-ct4|j64fen
Ocala|ocala||US|jl|313a|697m|-hlsr|j648yj
Ocaña|ocana||CO|18c|1sfr|1rl0|-fpz0|j64ebd
Oceanside|oceanside||US|bb|d2ke|74bx|-p5d2|j648hf
Ocotal|ocotal||NI|19b|q6g|2x64|-ij8a|j63vbn
Ocumare del Tuy|ocumare del tuy||VE|13o|3k54|2634|-eba0|j6438b
Odense|odense||DK|1nf|3e32|bvh0|2849|j64ghn
Odessa|odessa|odesa|UA|19q|l8ns|9yqg|6ky1|j64lcd
Odessa|odessa||US|1ph|29ty|6tq0|-lxvc|j64iyp
Odienné|odienne||CI|ga|12gx|21ds|-1mhk|j64gix
Ogbomosho|ogbomosho||NG|1bd|kdso|1qqw|wp8|j64lmt
Ogden|ogden||US|1s7|832g|8u5g|-nzy8|j648n1
Oğuz|oguz||AZ|19w|5b0|8swk|a66v|j63z43
Ōita|oita||JP|1a0|9mdn|74i8|s7ez|j64f01
Ojinaga|ojinaga||MX|db|h2o|6bxo|-mdms|j64cub
Okahandja|okahandja||NA|1az|g3z|-4plg|3mh8|j64dkl
Okandja|okandja|okondja|GA|no|5ir|-59p|2ycp|j64fml
Okara|okara||PK|1ei|4skg|6lqg|fqqs|j64bdz
Okayama|okayama||JP|1a1|ika4|7fj4|spb7|j646lz
Okha|okha||RU|1he|khs|bhdn|umzr|j64llj
Okhotsk|okhotsk||RU|ub|4aq|cq7a|up2i|j64llf
Oklahoma City|oklahoma city||US|1a3|gw0w|7lpc|-kwh2|j64m8z
Oktyabrsk|oktyabrsk|kandyagash|KZ|3s|lr8|alqj|cb8x|j64g01
Oktyabrskiy|oktyabrskiy|oktyabrsky|RU|72|2bhk|bo7s|bgi0|j645h7
Oktyabrsky|oktyabrsky|oktyabrskiy|RU|sf|16m|bacs|xhjn|j64jfz
Olavarría|olavarria||AR|e4|1uls|-7wq0|-cxic|j64k2t
Olbia|olbia||IT|1j2|z06|8rp3|21f3|j64dqh
Oldeani|oldeani||TZ|4f|668|-pug|7mb0|j64at1
Oldenburg|oldenburg||DE|17i|3l7m|bdyc|1rfc|j646gb
Olenyok|olenyok|olenek|RU|1hd|a|eoqq|o3o4|j64jcp
Olgiy|olgiy|olgii|MN|7g|qye|ahkp|ja24|j64dh5
Olinda|olinda||BR|1cj|jrao|-1pq8|-7gwk|j6482f
Olmaliq|olmaliq||UZ|1ox|2liv|8r7c|ewzy|j649st
Olmos|olmos||PE|xp|7k8|-1a50|-h3cs|j64ayt
Olomouc|olomouc||CZ|14f|2650|amy4|3p3o|j646hz
Olongapo|olongapo||PH|1w2|6iv8|36fc|ps3w|j64ckn
Olovyannaya|olovyannaya||RU|dl|6d3|ax4s|orpu|j64jaz
Olsztyn|olsztyn||PL|1u7|401a|bj4g|4e0w|j64617
Olympia|olympia||US|1u8|3d4o|a2y4|-qcaq|j64l97
Olyokminsk|olyokminsk||RU|1hd|7ps|cyug|psye|j64cqf
Omagh|omagh||GB|1a6|g8w|bpao|-1kbs|j644d7
Omaha|omaha||US|16q|iss6|8u7k|-kktg|j64m8x
Omaruru|omaruru||NA|im|8wr|-4leg|3f2u|j63w8b
Omboué|omboue||GA|19u|1ab|-c32|1zdg|j64fmd
Omchak|omchak|omtschak|RU|10n|a|d7kd|vpbz|j645q5
Omdurman|omdurman||SD|ug|1fc47|3chz|6ym8|j64lfx
Ometepec|ometepec||MX|me|ncv|3kpd|-l3ew|j64kh7
Omolon|omolon||RU|dw|t6|dzh0|yefc|j64j5p
Omsk|omsk||RU|1a8|obrs|bsbj|fqcc|j64ljf
Omsukchan|omsukchan||RU|10n|38p|deid|xe5s|j64jdh
Omutninsk|omutninsk||RU|v4|pb4|ckm5|b6go|j64c9f
Ondjiva|ondjiva|onjiva|AO|fg|7uh|-3npk|3ddg|j64htf
Ondo|ondo|ondo city|NG|1a9|5ib1|1ipk|11cg|j64d8l
Öndörkhaan|ondorkhaan|ondorhaan|MN|ny|bcz|a53j|nps4|j64jf5
Onega|onega||RU|4a|hid|dp9j|85sz|j64ked
Ongjin|ongjin||KP|p5|1he3|84q3|qv9f|j64di5
Ongole|ongole||IN|33|4cj0|3c2c|h5o4|j64fi3
Ongwediva|ongwediva||NA|1as|jbc|-3t6w|3dok|j64ki3
Onitsha|onitsha|asaba|NG|2y|1km6|1bdo|1gbc|j64d9d
Onslow|onslow||AU|1uo|fx|-4n40|oo37|j64k4d
Ontario|ontario||US|1ai|9ej|9fpm|-p2hf|j641kl
Onverwacht|onverwacht||SR|1bt|1mh|177k|-btxc|j640d7
Oostanay|oostanay|kostanay|KZ|1ew|52sl|benl|dmyj|j64jrp
Opobo|opobo||NG|13|qxr|z9k|1mc0|j64d6z
Opole|opole||PL|1ab|2tec|av36|3ucx|j6461z
Opuwo|opuwo||NA|wb|3qx|-3vck|2ymw|j64dkd
Oradea|oradea||RO|87|4kzq|a31g|4p4w|j644qn
Oral|oral|ural sk|KZ|1uh|4hvg|azlz|b03q|j64ktz
Oran|oran|wahran|DZ|1ad|h3qo|7njz|-4sr|j64mqp
Orange|orange||AU|176|uch|-74sg|vygo|j64m5t
Orange Walk|orange walk|orange walk town|BZ|1af|g2r|3vl4|-izc0|j64hkz
Orangeburg|orangeburg||US|1ll|rdc|76go|-hbxq|j642l7
Orangeville|orangeville||CA|1aa|p6o|9ev7|-h5xd|j64h2t
Oranjestad|oranjestad||AW||1h2f|2ooo|-f0ci|j64itl
Orcadas Station|orcadas station||AQ||19|-d0m9|-9l5x|j64iwb
Ordu|ordu||TR|1ag|3bot|8sd0|847f|j64ag1
Örebro|orebro||SE|1ah|2425|cper|39fs|j649lv
Orekhovo-Zuevo|orekhovo zuevo|orekhovo zuyevo|RU|14o|307r|bypk|8crs|j645db
Orel|orel|oryol|RU|1aj|7654|bcpw|7qbg|j64ken
Orenburg|orenburg||RU|1ak|bsjg|b3jc|bt8c|j64lj7
Orillia|orillia||CA|1aa|sx7|9k4w|-h0s7|j647jz
Oriximiná|oriximina||BR|1bz|rgd|-dks|-bz3g|j64gnv
Orizaba|orizaba||MX|1sy|7m6d|41g4|-ktgk|j645yx
Orlando|orlando||US|jl|sxo0|63zz|-hfy4|j64lb3
Orléans|orleans||FR|ce|4no5|a9lo|ens|j64fpd
Orlu|orlu||NG|ps|77r|18ml|1i9p|j64d73
Ormac|ormac|ormoc|PH|yd|3lb4|2ddf|qph7|j64cl5
Örnsköldsvik|ornskoldsvik||SE|1tx|let|dkkc|40f3|j64j0n
Orocue|orocue||CO|bz|26r|10zu|-fago|j64ebh
Orodara|orodara||BF|wu|edk|2coc|-11vc|j63zs3
Orongen Zizhiqi|orongen zizhiqi||CN|16t|uyo|au6b|qilr|j646nh
Orsha|orsha||BY|1ti|2wbq|bon5|6iqf|j64i3t
Orsk|orsk||RU|1ak|5agk|az50|ckdd|j64j7j
Oruro|oruro||BO|1ap|5a79|-3uqf|-edz8|j64k3j
Ōsaka|osaka|osaka kobe|JP|1aq|6q2i8|7g5c|t17a|j64n1t
Osakarovka|osakarovka|osakarov|KZ|1er|5mx|au9z|fjyb|j6462x
Osh|osh||KG|1ar|8dwt|8ot8|flng|j64bfh
Oshawa|oshawa||CA|1aa|9nyr|9ekw|-gwes|j647kp
Oshikango|oshikango||NA|19x|9l3|-3q97|3ej4|j64dkv
Oshkosh|oshkosh||US|1uw|1k3e|9fp7|-iz75|j6495j
Oshogbo|oshogbo|osogbo|NG|1ax|8r05|1nyg|z6o|j64d8z
Osijek|osijek||HR|1au|21d1|9rgw|404w|j64eoh
Oskemen|oskemen|ust kamenogorsk|KZ|hw|6u6z|apq4|hpgl|j64lyh
Oslo|oslo||NO|1av|hwag|cuc2|2axk|j64mup
Osnabrück|osnabruck||DE|17i|4yg4|b7ec|1q44|j64el7
Osório|osorio||BR|1g0|qpw|-6ek0|-arvw|j6479v
Osorno|osorno||CL|zd|3axf|-8p1g|-foi8|j64krd
Östersund|ostersund||SE|rn|zmq|djix|351g|j64k87
Ostrava|ostrava||CZ|14f|a9kj|aohs|3wtg|j64eol
Otar|otar||KZ|2e|8o6|9bwy|g4cr|j64g4n
Otaru|otaru||JP|of|32y8|998v|u7sn|j64f55
Otavi|otavi||NA|1az|3iq|-47jk|3pt8|j63w9l
Otjiwarongo|otjiwarongo||NA|1az|j5b|-4dv7|3ke8|j64dkp
Otradnyy|otradnyy|otradny|RU|1hq|12of|bfv6|b076|j64ccn
Ōtsu|otsu||JP|1jz|bic0|7i40|t4cy|j646pd
Ottawa|ottawa|ottawa gatineau|CA|1aa|ojhk|9qga|-g84c|j64moj
Ottumwa|ottumwa||US|q1|k1q|8sgh|-jt2s|j641nx
Oturkpo|oturkpo|otukpo|NG|7x|1gn0|1jhc|1qqc|j64d77
Otuzco|otuzco||PE|x4|7ti|-1oyg|-gu90|j644ut
Ouadda|ouadda||CF|nq|46y|1q8v|4su8|j64h9v
Ouagadougou|ouagadougou||BF|rx|omko|2ngr|-bs3|j64mrp
Ouahigouya|ouahigouya||BF|1vf|1pcg|2wpk|-io8|j64io7
Ouargla|ouargla|ghardina|DZ|1b2|3s0f|6uok|157c|j64l4h
Oudtshoorn|oudtshoorn||ZA|1up|1n6s|-773s|4r7w|j64kbx
Ouésso|ouesso||CG|1id|luo|cf8|3fuc|j64krz
Ouezzane|ouezzane|ouazzane|MA|kr|1hqy|7glj|-16z8|j64brb
Ouidah|ouidah||BJ|4x|1sfj|1d2s|g4k|j64hyt
Oujda|oujda|taza|MA|1am|8rvz|7fo4|-eqk|j64lhf
Oulu|oulu||FI|18w|2xio|dxjk|5gj0|j64ktn
Oum el Bouaghi|oum el bouaghi||DZ|1b9|25sl|7omc|1j64|j63zix
Oum Hadjer|oum hadjer||TD|79|evb|2umk|47vl|j64eej
Ourense|ourense||ES|k7|2j4r|92mc|-1oq4|j64j21
Ourinhos|ourinhos||BR|1nj|23gn|-4x8k|-aoss|j647z1
Outjo|outjo||NA|wb|525|-4b5z|3gjc|j64dk7
Ouyen|ouyen||AU|1t8|12w|-7ikm|ui4f|j64igt
Ovalle|ovalle||CL|ew|1niq|-6k18|-f9dt|j64kr5
Oviedo|oviedo||ES|1e8|51tv|9aht|-18zg|j64a8f
Owando|owando||CG|fj|qae|-3p8|3eu8|j64ggn
Owen Sound|owen sound||CA|1aa|hgh|9jvm|-hbuc|j647jx
Owensboro|owensboro||US|u3|1gc1|83gy|-io65|j64931
Owerri|owerri||NG|ps|4lxa|16du|1i7o|j63w5z
Owo|owo||NG|1a9|5xem|1jk4|174s|j64d8h
Oxford|oxford||GB|1bc|44rg|b3go|-9n8|j64aiv
Oxford House|oxford house||CA|11m|54|bs00|-kf2y|j64gyj
Oyem|oyem||GA|1uy|xi7|ch2|2hdl|j64kpt
Oymyakon|oymyakon|oimekon|RU|1hd|dw|dld2|ulma|j6489j
Oyo|oyo||NG|1bd|fryg|1oko|ubo|j64d93
Oytal|oytal||KZ|1wf|hht|974x|fp8l|j64gap
Ozamis|ozamis|ozamiz|PH|13p|23gu|1quu|qjl8|j64ckh
Pa-an|pa an|hpa an|MM|tr|12kw|3m0k|kx7r|j6402z
Paamiut|paamiut||GL|vk|1fq|dafd|-amzj|j64jqj
Paarl|paarl||ZA|1up|40yh|-7810|42ao|j64bj3
Pabna|pabna||BD|1ff|2ye8|556s|j4no|j64ip1
Pacasmayo|pacasmayo||PE|x4|ub6|-1l3q|-h1yy|j64k9f
Pachuca|pachuca||MX|o6|6ul9|4bmw|-l5t0|j64d1n
Padang|padang||ID|1mz|ibq0|-7e5|lid9|j64mhd
Padangpanjang|padangpanjang|padang,padang panjang|ID|1mz|y0w|-3gw|litj|j64dn5
Padangsidempuan|padangsidempuan|padang sidempuan|ID|1n1|5pxe|apr|l9zy|j64dmf
Padilla|padilla||BO|dz|294|-44x0|-ds7w|j64hbt
Paducah|paducah||US|u3|vvp|7y51|-izn4|j6492z
Pagadian|pagadian||PH|1w4|3f52|1ole|qgzi|j64ckf
Pago Pago|pago pago||AS||9pc|-325q|-10l6i|j64m71
Paita|paita||PE|1da|17br|-139w|-hdxc|j64k8v
Pakalongan|pakalongan|pekalongan|ID|qv|5tvk|-1h30|ni7w|j64dzd
Pakhachi|pakhachi||RU|sf|a|czg8|108ec|j6466h
Pakokku|pakokku||MM|10r|2py2|4klk|kdoy|j64irj
Pakwach|pakwach||UG|16p|dj9|j28|6qwg|j64alb
Pakxe|pakxe|pakse|LA|cr|27av|38ol|mohz|j64dhf
Pala|pala||TD|12u|rd6|205c|37he|j64eex
Palana|palana||RU|sf|2tz|cnw8|ya6k|j64mh5
Palangkaraya|palangkaraya||ID|s9|36f5|-h1s|oexo|j64fc5
Palapye|palapye||BW|cb|nne|-4u2k|5tc4|j64i63
Palatka|palatka||RU|10n|gjw|cvqg|wcco|j64jdf
Palatka|palatka||US|jl|gjw|6crh|-hi0x|j642g3
Palembang|palembang||ID|1n0|11hjc|-mz9|mg8p|j64mif
Palermo|palermo||IT|1ka|ihw8|866u|2uzt|j64mhh
Pali|pali||IN|1fe|4i47|5j00|fptf|j64g9f
Palikir|palikir||FM||3l1|1hda|xwak|j64l51
Pallasovka|pallasovka||RU|1tl|d83|aq65|a1ph|j64c3d
Pallisa|pallisa||UG|1bl|nq1|8u2|783q|j63txz
Palm Coast|palm coast||US|jl|11hd|6bx0|-heq1|j642fx
Palm Springs|palm springs||US|bb|8d0j|78mm|-oz6b|j648i7
Palma|palma|palma de mallorca|ES|q9|81y5|8hcv|kha|j64kad
Palma Soriano|palma soriano||CU|1iu|27ca|4bzw|-gaes|j646cv
Palmas|palmas||BR|1q5|51kj|-26zt|-acla|j64kwz
Palmas|palmas||BR|1bw|u7i|-5obk|-b58g|j647ap
Palmeira dos Índios|palmeira dos indios||BR|24|vpj|-20nq|-7uja|j647el
Palmer|palmer||US|26|a47|d7b1|-vyk7|j64j0h
Palmer Station|palmer station||AQ||1a|-dvpk|-dq6t|j64iud
Palmerston North|palmerston north||NZ|11c|1rkw|-8nd3|11mzs|j64n57
Palopo|palopo||ID|1mv|1vw|-nx3|prqz|j64e2f
Palu|palu||ID|1mw|d4kd|-6zy|pomy|j64kjb
Pampa del Infierno|pampa del infierno||AR|ck|295|-5olq|-d3yq|j647x1
Pamplona|pamplona||ES|em|5vu9|96eg|-cqc|j64j2x
Pamplona|pamplona||CO|18c|15cj|1l0w|-fknc|j64eb7
Panaji|panaji||IN|l6|1elu|3bjc|ftl0|j640rv
Panama City|panama city|ciudad de panam,panama|PA|1bn|rgfc|1x7o|-h1p2|j64mdn
Panama City|panama city||US|jl|257s|6gpe|-icx5|j642hv
Panda|panda||MZ|px|gq|-55o5|7fzb|j64btp
Panevežys|panevezys||LT|1bo|2qb1|by3c|581g|j6452x
Pangkalpinang|pangkalpinang|pangkal pinang|ID|6j|2p65|-g1s|mr24|j64kmd
Pangnirtung|pangnirtung||CA|19e|10o|e6ad|-e3bw|j64k1p
Panipat|panipat||IN|ni|69xk|6aus|ghwk|j64fh7
Pannawonica|pannawonica||AU|1uo|j2|-4my6|oxki|j64i7j
Panshi|panshi||CN|r8|1uiw|97ci|r0nl|j64eyx
Pánuco|panuco||MX|1sy|r90|4q7w|-l1n0|j64d2t
Panzhihua|panzhihua||CN|1k9|9w3t|5ov0|lsyc|j64jkb
Papasquiaro|papasquiaro|santiago papasquiaro|MX|hm|hjy|5blc|-mkt4|j64cup
Papeete|papeete||PF||2tm7|-3rae|-w22b|j64m7l
Paphos|paphos||CY|1bq|rqx|7g6f|6y69|j6405f
Paracatu|paracatu||BR|13l|1ild|-3opo|-a1ng|j64gqt
Parachinar|parachinar||PK|j3|16yt|79kg|f0wg|j6454f
Paracuru|paracuru||BR|c8|gcs|-q8b|-8d8g|j64guj
Paragominas|paragominas||BR|1bz|1hpp|-mu4|-a6fo|j64goh
Paragould|paragould||US|49|i3e|7q7v|-jebp|j641nb
Paraguarí|paraguari||PY|1bu|ekh|-5hoo|-c91s|j644yj
Paraíso|paraiso||MX|1ns|idy|3xz4|-jzd8|j645wl
Parakou|parakou||BJ|93|41px|202g|k7s|j64m4n
Paramaribo|paramaribo||SR|1bv|5g49|190u|-bto6|j64mbp
Paraná|parana||AR|ij|5mdz|-6sut|-cz2t|j647yb
Paranaguá|paranagua||BR|1bw|30t1|-5gz3|-aeht|j647az
Paranaíba|paranaiba||BR|12r|oux|-47uk|-az28|j64gph
Paraparaumu|paraparaumu||NZ|1ua|jhr|-8rm2|11iat|j64n6j
Parbhani|parbhani||IN|10w|83x2|44ow|gga8|j64fkp
Pardubice|pardubice||CZ|w3|2am0|aq44|3dls|j64env
Parepare|parepare||ID|1mv|1vq8|-uzr|pn3h|j64lqb
Parintins|parintins||BR|2q|1dpo|-k50|-c5t4|j64kw5
Paris|paris||FR|1x2|5w9z4|ah2m|hzm|j64n3x
Parkersburg|parkersburg||US|1ul|1bsf|8ezf|-hhc0|j6430t
Parkes|parkes||AU|176|8ld|-73mo|vrac|j64ic3
Parma|parma||IT|ih|3k3f|9lrc|27mo|j64dpz
Parnaíba|parnaiba||BR|1d3|2yhk|-mgc|-8yas|j64kxt
Pärnu|parnu||EE|1eo|y3k|cif7|595c|j64kpv
Paro|paro||BT|1pm|bko|5vna|j5y0|j63zm3
Parowan|parowan||US|1s7|1zf|83zt|-o6kw|j648md
Parras|parras|parras de la fuente|MX|e9|ovx|5g58|-lwfb|j64cu3
Parry Sound|parry sound||CA|1aa|5hd|9psp|-h5je|j64h4f
Partizansk|partizansk||RU|1e5|ws9|98tx|sj9x|j645ot
Pasadena|pasadena||US|1ph|dgy4|6cv5|-ke5x|j6424t
Pasadena|pasadena||US|bb|33l6|7bl0|-pbkd|j648gf
Pasay City|pasay city|pasay|PH|13c|8n08|349s|pxn4|j64ckx
Paso de los Toros|paso de los toros||UY|1nw|a79|-715w|-c418|j640zp
Paso Río Mayo|paso rio mayo|rio mayo|AR|dv|1ep|-9shu|-f26i|j647p7
Paso Robles|paso robles||US|bb|kyd|7mwa|-pv90|j641e3
Passo Fundo|passo fundo||BR|1g0|3uix|-61z8|-b8h4|j64k0l
Passos|passos||BR|13l|2474|-4fss|-9zn8|j6477h
Pasto|pasto|san juan de pasto|CO|16f|86xo|9d4|-gkaz|j64lqp
Pasuruan|pasuruan||ID|qw|apsw|-1mvc|o754|j64e1b
Paterson|paterson||US|174|38o5|8rqo|-fwas|j6433h
Pathankot|pathankot||IN|oa|5fz7|6wzz|g89c|j64fgb
Pathein|pathein|bassein|MM|5d|52xt|3leg|kb3g|j64ir3
Pathum Thani|pathum thani||TH|1c3|3b58|305n|ljpx|j649vb
Pati|pati||ID|qv|2mqp|-1g0n|nsqz|j64dz7
Patiala|patiala||IN|1ei|7214|6hyc|gde2|j64g95
Pativilca|pativilca||PE|yn|om9|-2ak4|-gob4|j64b33
Patna|patna||IN|86|1a94g|5hql|i8up|j64myt
Patos|patos||BR|1bx|1zfj|-1i5w|-7zqc|j64gxb
Patra|patra|patras|GR|hp|3i1s|86zg|4no4|j64jr3
Pattani|pattani||TH|1c4|37qo|1gyo|lp90|j63v81
Paulatuk|paulatuk||CA|18z|86|evd5|-qknt|j647jt
Paulo Afonso|paulo afonso||BR|5z|1tuu|-1zzv|-879d|j647et
Pavlodar|pavlodar||KZ|1c5|71uy|b7js|ghr0|j64lyd
Paysandú|paysandu||UY|1c7|1oyw|-6xgk|-cg5c|j64jt3
Peace River|peace river||CA|29|44c|c1wd|-p4yp|j64m1n
Pec|pec|peje|XK|1x4|2957|9563|4cpv|j64b7z
Pechora|pechora||RU|vh|zkx|dyrn|c9fb|j64kfd
Pecos|pecos||US|1ph|6gk|6qem|-m6lz|j648uz
Pécs|pecs||HU|6t|3zpy|9vk4|3wl4|j64amt
Pedernales|pedernales||DO|1c9|8jk|3v6k|-fdk2|j63xqh
Pedreiras|pedreiras||BR|11v|aiu|-z9c|-9koc|j64gm7
Pedro Juan Caballero|pedro juan caballero||PY|2l|27b7|-4tye|-by8w|j64b4j
Pedro Luro|pedro luro||AR|e4|5h8|-8gnl|-dfo1|j647tj
Pekanbaru|pekanbaru|pekan baru|ID|1fw|h4ig|4dh|lql3|j64kj1
Pelotas|pelotas||BR|1g0|6vfm|-6szg|-b7s4|j64m0v
Pematangsiantar|pematangsiantar||ID|1n1|7b9s|mum|l8d3|j64kiz
Pemba|pemba||MZ|b3|2ddf|-2s6e|8oqz|j64lgv
Pembroke|pembroke||CA|1fa|bzz|9ts7|-gj1a|j64h6b
Penápolis|penapolis||BR|1nj|1619|-4l78|-aqf4|j6480n
Pendleton|pendleton||US|1ai|cyn|9seu|-pgkj|j648lf
Penedo|penedo||BR|24|whd|-278o|-7u94|j64gvj
Penola|penola||AU|1lj|162|-80g6|u6jr|j64if5
Penonome|penonome||PA|ec|m72|1tnw|-h828|j6457v
Pensacola|pensacola||US|jl|50uo|6iqb|-ioyx|j64izd
Penticton|penticton||CA|9r|t3t|aly4|-pmpl|j64h0z
Penza|penza||RU|1ce|aziy|bec8|9n80|j64lin
Penzance|penzance||GB|ez|g24|aqu1|-16to|j64ad5
Peoria|peoria||US|pl|3oyc|8q1k|-j7wc|j64jvv
Perabumulih|perabumulih|prabumulih|ID|1n0|27u6|-qkg|mc97|j64e0f
Peregrebnoye|peregrebnoye||RU|ue|a|dhuu|dy7f|j64ce5
Pereira|pereira||CO|1g2|c6um|1148|-g7y8|j64e8l
Pergamino|pergamino||AR|e4|1vms|-79kk|-czd0|j64hex
Perito Moreno|perito moreno||AR|1in|2wm|-9zkg|-f7bq|j64l1x
Perm|perm||RU|1ci|ldag|cfjn|c20g|j64mgn
Përmet|permet||AL|l2|88u|8mg4|4d1c|j63yv1
Pernik|pernik||BG|1ck|1rmr|94s4|4xn7|j6486z
Perpignan|perpignan||FR|xv|354s|95h4|mdk|j646tn
Perryville|perryville||US|26|35|bzgy|-y40n|j643mb
Perth|perth||AU|1uo|wu3k|-6ujv|ott9|j64n03
Perth|perth||GB|1cl|uli|c36r|-qrw|j64abv
Perugia|perugia||IT|1rr|372d|98n4|2nlo|j64dt3
Pervouralsk|pervouralsk||RU|1nc|2v34|c74c|cum6|j64kff
Pescara|pescara||IT|5|6qw5|93l6|31pn|j64dsl
Peshawar|peshawar||PK|15m|rxeg|7aee|fbyb|j64md7
Peshkopi|peshkopi||AL|gj|bgg|8xmp|4dnx|j63yw3
Petatlán|petatlan||MX|me|ome|3r6s|-lpek|j64d1j
Peter I Island|peter i island||AQ||1|-eqts|-jeya|j64iv1
Peterborough|peterborough||GB|1cn|304t|b9po|-1xg|j64aj5
Peterborough|peterborough||CA|1aa|1siz|9htk|-gsf9|j647kl
Peterborough|peterborough||AU|1lj|1ax|-72da|tr8t|j64ief
Petersburg|petersburg||US|1tg|2jht|7z92|-gl8m|j642xh
Peto|peto||MX|1vq|dl3|4bbo|-j240|j64607
Petoskey|petoskey||US|13e|9rv|9q3u|-i7io|j649bv
Petrolina|petrolina||BR|1cj|5ldl|-20dk|-8oks|j64m3t
Petropavlovsk|petropavlovsk|petropavl|KZ|18h|4w3y|brgg|eu3s|j64jsb
Petropavlovsk-Kamchatsky|petropavlovsk kamchatsky|petropavlovsk kamchatskiy|RU|sf|40ia|bdfg|xzxy|j64mh7
Petrópolis|petropolis||BR|1g1|64qf|-4ton|-99c0|j64gxj
Petrovsk Zabaykalskiy|petrovsk zabaykalskiy|petrovsk zabaykalsky|RU|dl|g49|azp7|nbrb|j645of
Petrozavodsk|petrozavodsk||RU|t2|5oht|d98k|7ci8|j64li7
Pevek|pevek||RU|dw|3qd|extc|10i59|j64j5t
Phan Rang|phan rang|phan rang thap cham|VN|17s|3upp|2h92|ncx5|j649zn
Phan Thiet|phan thiet||VN|au|77wu|2cd5|n63t|j64a0j
Phangnga|phangnga|phang nga|TH|1cp|7gs|1t7i|l4ak|j63uuj
Phatthalung|phatthalung||TH|1cq|xky|1mra|lg8a|j63uwf
Phayao|phayao||TH|1cr|g8y|43x7|lewb|j649tt
Phetchabun|phetchabun||TH|1cs|1334|3iou|lojq|j63uyv
Phetchaburi|phetchaburi|phet buri|TH|1ct|1xtt|2t6l|lf5g|j649vt
Phichit|phichit||TH|1cu|rlc|3iue|liaq|j63uyj
Philadelphia|philadelphia||US|1cd|39pnk|8knn|-g413|j64mtn
Phitsanulok|phitsanulok||TH|1cv|3ik1|3luj|lhpl|j649u1
Phnom Penh|phnom penh|phnum penh|KH|1cw|vf68|2h4w|mhiz|j64mqf
Phnum Tbeng Meanchey|phnum tbeng meanchey|phnom tbeng meanchey|KH|1e1|it8|2ylz|mhxf|j63zd7
Phoenix|phoenix|phoenix mesa|US|48|243yw|76t7|-o0r3|j64mt5
Phongsali|phongsali||LA|1d0|4mo|4nb5|lvt4|j63y9f
Phonsavan|phonsavan|xiangkhoang|LA|1v1|sxv|463b|m49k|j64dhj
Phrae|phrae||TH|1cy|tqi|3w2l|lgv1|j649tx
Phuket|phuket||TH|1cz|319u|1orx|l347|j64jyp
Phyarpon|phyarpon|pyapon|MM|5d|1em9|3hpx|kial|j64iqp
Piatra-Neamt|piatra neamt||RO|16o|278g|a26w|5nkm|j63usb
Pichilemu|pichilemu||CL|yi|8yb|-7da0|-ffk0|j646xj
Picos|picos||BR|1d3|18d3|-1imo|-8vr4|j64kxv
Picton|picton||NZ|114|29c|-8uit|11apy|j64n7b
Piedras Negras|piedras negras||MX|e9|2zqb|65ic|-ljph|j64ctx
Pierre|pierre||US|1ln|apj|9icj|-lib6|j64m91
Pietermaritzburg|pietermaritzburg|pietermaritzburg ulundi|ZA|wh|g3ct|-6ch0|6iho|j64kcz
Piggs Peak|piggs peak||SZ|o5|4fq|-5kbe|6p3q|j63v8l
Pijijiapan|pijijiapan||MX|d8|i9n|3d2g|-jzag|j64d2x
Pilar|pilar||PY|1ca|lxv|-5rbr|-chug|j64b4d
Pilibhit|pilibhit||IN|1sa|2t34|64zk|h3tg|j6472d
Pilot Point|pilot point||US|26|1w|cc66|-xrt7|j649it
Pimenta Bueno|pimenta bueno||BR|1gd|jvm|-2htc|-d4as|j64755
Pimentel|pimentel||PE|xp|c00|-1gp4|-h4qs|j64ayn
Pinar del Rio|pinar del rio||CU|1d7|40a6|4sz3|-hxth|j64jhj
Piñas|pinas||EC|ib|d3p|-sbg|-h2l0|j646ad
Pindamonhangaba|pindamonhangaba||BR|1nj|2u0q|-4wuo|-9quk|j647yt
Pine Bluff|pine bluff||US|49|1529|7c3z|-jpwf|j648nl
Pine Creek|pine creek||AU|18x|ih|-2ylu|s93r|j64i6n
Pingdingshan|pingdingshan|pingdingshan henan|CN|nx|i73c|78a4|oa7p|j64jld
Pingdu|pingdu||CN|1js|1y9x|7vvk|ppgo|j64evf
Pingliang|pingliang||CN|kc|4fx4|7m5k|mv5d|j64dun
Pingtung|pingtung|pingtung city|TW|1d8|asiy|4v0h|ptn5|j64iwz
Pingxiang|pingxiang|pingxiang jiangxi|CN|r4|klig|5x4s|oegh|j64mjv
Pingxiang|pingxiang||CN|m7|o05|4qi6|mvqn|j64dvf
Pingyi|pingyi||CN|1js|1odq|7m00|p7k8|j64evb
Pingzhen|pingzhen||TW|1ok|4bkw|5cgv|pzb5|j640uz
Pinheiro|pinheiro||BR|11w|u0d|-jfw|-9nx0|j64gmp
Pinrang|pinrang||ID|1mv|3wzv|-t7l|pn8q|j64e2n
Pinsk|pinsk||BY|9n|2swp|b67z|5lcd|j64i3b
Piracicaba|piracicaba||BR|1nj|7c1t|-4v8c|-a7lc|j64805
Piraeus|piraeus|piraievs|GR|53|9zm9|84to|52vc|j646yl
Pirapora|pirapora||BR|13l|1af8|-3ppw|-9mok|j64k0f
Pirassununga|pirassununga||BR|1nj|1am5|-4poc|-a5z0|j647zx
Pires do Rio|pires do rio||BR|l8|j5i|-3phf|-acj4|j64hcp
Pirgos|pirgos|pyrgos|GR|hp|ha7|82rp|4lic|j64fud
Piripiri|piripiri||BR|1d3|ym8|-wy0|-8ygc|j64gvf
Pisa|pisa||IT|1qi|4cw8|9dcl|288w|j64dqp
Pisco|pisco||PE|pf|1qnr|-2xsc|-gc48|j64k9p
Piso Firme|piso firme||BO|1in|20|-2xku|-d9d6|j64hwb
Pita|pita||GN|119|fh0|2dhs|-2noq|j63yed
Pitești|pitesti||RO|45|3nyl|9m43|5bxy|j64ay5
Pittsburgh|pittsburgh||US|1cd|13e7k|8nz3|-h5ar|j64m9v
Pittsfield|pittsfield||US|12j|zo6|93j6|-fp9y|j642ah
Piura|piura||PE|1da|8i9w|-1478|-ha58|j64lev
Pizen|pizen|plzen|CZ|t4|3iok|anss|2v34|j64emh
Placetas|placetas||CU|1tc|16r4|4s6u|-h2mj|j646f7
Plast|plast||RU|d0|d5m|bnid|d179|j645hh
Plattsburgh|plattsburgh||US|178|mk6|9kva|-fqt0|j6434l
Play Ku|play ku|play cu,pleiku|VN|kw|329g|2zw9|n5c0|j64jyt
Pleven|pleven||BG|1dd|2jkj|9b26|59x2|j64i1t
Ploiești|ploiesti||RO|1e0|4zfi|9mt9|5kwd|j64ayf
Plovdiv|plovdiv||BG|1de|7aq6|919g|5b04|j6486v
Plumtree|plumtree||ZW|12m|1no|-4e0r|5yns|j64a5d
Plymouth|plymouth||GB|1df|5atd|asry|-w3k|j64adt
Pô|po||BF|15r|dtw|2e6i|-8ra|j63zz1
Pocatello|pocatello||US|ph|1ddq|96sp|-o3mn|j64ixb
Pochutla|pochutla|san pedro pochutla|MX|19l|iw1|3ddk|-kod8|j64czx
Poços de Caldas|pocos de caldas||BR|13l|353w|-4o20|-9zc4|j6476z
Podgorica|podgorica||ME|1dg|34je|93o4|44nr|j64lhj
Podkamennaya Tunguska|podkamennaya tunguska|podkamennaya|RU|w0|a|d7az|jbec|j64cnn
Podolsk|podolsk||RU|14o|6vej|bvbg|81kz|j64c1p
Poffader|poffader|pofadder|ZA|18u|398|-68sh|45ka|j64bi7
Pogradec|pogradec||AL|vo|uv4|8rl4|4fg0|j63yrj
Pohang|pohang||KR|fp|9buq|7pxt|rq8j|j64j8j
Point Hope|point hope||US|26|ct|endh|-zr3k|j64mab
Pointe-à-Pitre|pointe a pitre||GP|m1|349z|3hbj|-d6si|j64gll
Pointe-Noire|pointe noire||CG|vu|e4jw|-10t0|2jo0|j64lzv
Poitier|poitier|poitiers|FR|1di|1ubs|9zft|2kl|j646t1
Pokhara|pokhara||NP|ld|4abk|6234|hzxk|j64isb
Pokrovsk|pokrovsk||RU|1hd|7j7|d6hi|rocp|j64cq1
Pol-e Khomri|pol e khomri|pul e khomri|AF|5x|17ht|7pef|eq3n|j6484b
Polatlı|polatli||TR|37|1zym|8hfm|6w1s|j644mj
Polatsk|polatsk|polotsk|BY|1ti|1rgy|bw5q|6644|j6487l
Polevskoy|polevskoy||RU|1nc|1eqy|c3iq|cwew|j64c9x
Polokwane|polokwane|pietersburg polokwane|ZA|ys|4psd|-54c4|6b8k|j64kcp
Polson|polson||US|147|43y|a7yo|-ogu7|j64187
Poltava|poltava||UA|1dj|6t93|amik|7eqv|j649ph
Polyarnyy|polyarnyy|polyarny|RU|157|etc|etzo|763q|j645av
Polygyros|polygyros||GR|u2|422|8nky|50yq|j63y1p
Ponca City|ponca city||US|1a3|ji1|7v8i|-kt45|j648rb
Ponce|ponce||PR||3fpq|3uw4|-ea0m|j64isn
Pond Inlet|pond inlet||CA|19e|171|fkua|-gpup|j64kzl
Ponta Delgada|ponta delgada||PT|5f|1bh2|839n|-5i1m|j64lfb
Ponta Grossa|ponta grossa||BR|1bw|69g1|-5dlg|-ar1c|j64m0z
Ponte Nova|ponte nova||BR|13l|116j|-4dhc|-970n|j64gqj
Pontes e Lacerda|pontes e lacerda||BR|12q|mo5|-39fo|-cpy4|j64grj
Pontiac|pontiac||US|13e|1ggq|953r|-huo6|j649bh
Pontianak|pontianak||ID|s7|d0lr|-8c|nfio|j64km5
Popayán|popayan||CO|c5|5jni|io8|-gf4k|j64jhx
Poplar Bluff|poplar bluff||US|13u|fxy|7vn6|-jdjv|j648pn
Popondetta|popondetta||PG|18s|lra|-1vnw|vrw4|j64bq5
Porbandar|porbandar||IN|fo|5130|4n7g|exks|j64jt1
Pori|pori||FI|1j4|1n8k|d6dh|4o0l|j646zp
Porirua|porirua||NZ|1ua|14ic|-8tar|11h64|j64n6l
Porlamar|porlamar||VE|19a|47ye|2ckk|-doo4|j649a3
Poronaysk|poronaysk||RU|1he|cv9|ajy8|uo1u|j64csd
Port Alfred|port alfred||ZA|i0|duv|-7797|5reo|j64buf
Port Antonio|port antonio||JM|1dq|b40|3w46|-gdco|j63x1t
Port Arthur|port arthur||US|1ph|17xt|6epa|-k4ra|j648td
Port-au-Prince|port au prince||HT|1b6|16to0|3z2u|-fi5w|j64mbh
Port Augusta|port augusta||AU|1lj|aq1|-6yp0|tj1g|j64k5t
Port Blair|port blair||IN|32|2qfe|2i0u|jvk0|j64fkz
Port Burwell|port burwell||CA|179|24q|cx0p|-dvjn|j64l1p
Port Charlotte|port charlotte||US|jl|1dlj|5sc0|-hlj5|j642ex
Port-De-Paix|port de paix||HT|184|qqp|49sm|-flyf|j63tkj
Port Denison|port denison||AU|1uo|xp|-69y4|ompa|j64i85
Port Douglas|port douglas||AU|1f2|2bc|-3j72|v6d7|j64in5
Port Elizabeth|port elizabeth||ZA|i0|lvt4|-7a3l|5hil|j64me1
Port-Gentil|port gentil||GA|19u|2i5g|-5k0|1vqw|j64mkn
Port Harcourt|port harcourt||NG|1g6|lv1c|114n|1i2p|j64lml
Port Hardy|port hardy||CA|9r|1rr|avc3|-rbso|j64h0d
Port Hedland|port hedland||AU|1uo|b0w|-4cps|pf64|j64m5j
Port Heiden|port heiden||US|26|2u|c7f7|-xzz1|j643lv
Port Hope Simpson|port hope simpson||CA|179|5h|b9cl|-c2ew|j647oh
Port Lavaca|port lavaca||US|1ph|927|64sw|-kpll|j648uh
Port Lincoln|port lincoln||AU|1lj|aim|-7g04|t4cq|j64m61
Port Louis|port louis||MU||crhf|-4blu|cbo8|j64m7f
Port Macquarie|port macquarie||AU|176|11gj|-6qmq|wrxf|j64k57
Port Maria|port maria||JM|1h8|63m|3xsq|-ghd4|j63x2n
Port-Menier|port menier||CA|1fa|7b|aofm|-dsig|j647lj
Port Morant|port morant||JM|1ha|8wg|3u1q|-gcyi|j63x3l
Port Moresby|port moresby||PG|cb|62xh|-2113|vjqt|j64mdj
Port-of-Spain|port of spain||TT|1do|6bkm|2a6w|-d6o2|j64lbv
Port Pirie|port pirie||AU|1lj|9ne|-743r|tkqk|j64ig5
Port Shepstone|port shepstone||ZA|wh|14qh|-6l17|6j14|j64bnp
Port St. Johns|port st johns||ZA|i0|4kz|-6s1j|6bub|j64bun
Port Sudan|port sudan||SD|1fp|ahvh|47cu|7z5w|j64mbz
Port Vila|port vila||VU|1jx|xzc|-3sty|102qm|j64mb7
Portachuelo|portachuelo||BO|1in|8v1|-3py8|-dl74|j6485x
Portalegre|portalegre||PT|1dp|c0t|8f5w|-1l9y|j63vfl
Portel|portel||BR|1bz|gg3|-f1o|-aw4o|j6474x
Portimão|portimao||PT|j8|1b8q|7yix|-1tud|j64b5t
Portland|portland||US|1ai|146rc|9r90|-qamb|j64m8n
Portland|portland||US|10z|2wu2|9cz6|-f20n|j64jx5
Portland|portland||AU|1t8|940|-87u0|ucik|j64m65
Porto|porto||PT|1dr|snmw|8tj4|-1uiz|j64j3x
Porto Alegre|porto alegre||BR|1g0|2bydk|-6fup|-az2s|j64mzb
Porto Nacional|porto nacional||BR|1q5|71l|-2ak8|-adlz|j64k07
Porto-Novo|porto novo||BJ|1ba|6fhc|1e0x|k6u|j64m4p
Porto Santana|porto santana||BR|2o|1srb|-b0|-aywo|j64h2n
Porto Seguro|porto seguro||BR|5z|2n1h|-3irs|-8djk|j64gw1
Porto União|porto uniao||BR|1im|1j8a|-5mgs|-ay4w|j64gtp
Porto Velho|porto velho||BR|1gd|6k90|-1vik|-dp20|j64m0b
Portoviejo|portoviejo||EC|11a|4ktd|-86g|-h8u0|j64jhb
Portsmouth|portsmouth||GB|1ds|9h8s|avz7|-8c0|j64aj1
Porvoo|porvoo||FI|i3|9g2|cy1w|5i1g|j64fzx
Poso|poso|poso kota|ID|1mw|10cm|-aq0|pvsg|j64dnx
Potchefstroom|potchefstroom||ZA|18n|2nf9|-5q0k|5t3s|j64blj
Potenza|potenza||IT|73|1hac|8plg|3dwm|j63wln
Poti|poti||GE|1hs|10dp|919x|8xjg|j64fw1
Potiskum|potiskum||NG|1vk|1ucy|2icw|2dhs|j64dbf
Potosí|potosi||BO|1dv|3ut9|-4700|-e3bw|j64hvt
Potsdam|potsdam||DE|9j|4oa7|b8bo|2suk|j64eo3
Poughkeepsie|poughkeepsie||US|178|3nxw|8xre|-fudq|j64345
Pouso Alegre|pouso alegre||BR|13l|2gw1|-4rg8|-9uh4|j64765
Powell|powell||US|1uz|5bj|9lcz|-nb6o|j641mv
Powell River|powell river||CA|9r|9uz|aowl|-qp18|j64h1d
Poza Rica de Hidalgo|poza rica de hidalgo|poza rica|MX|1sy|5gcx|4ekg|-kw30|j64d2b
Poznań|poznan||PL|ly|ddh9|b8d6|3mef|j64dfd
Pozo Almonte|pozo almonte||CL|1oq|8cu|-4ceg|-eykw|j64fr3
Pozo Colorado|pozo colorado||PY|1e2|1nb|-50sc|-cm60|j644xn
Prachin Buri|prachin buri||TH|1dx|1pjh|30gs|lq88|j649v1
Prachuap Khiri Khan|prachuap khiri khan||TH|1dy|pv5|2j2m|le28|j63v2v
Prague|prague||CZ|1dz|owls|aqgl|33ls|j64mwv
Praia|praia||CV||2fh0|373j|-51gf|j64msl
Praya|praya||ID|19f|r5b|-1vav|oxbf|j64dnj
Prescott|prescott||US|48|16gu|7ewc|-o3ni|j64ixh
Presidencia Roque Saenz Pena|presidencia roque saenz pena||AR|ck|1r6f|-5qpo|-cyfo|j647wx
Presidente Dutra|presidente dutra||BR|11w|nei|-14ic|-9jio|j64741
Presidente Prudente|presidente prudente||BR|1nj|4hni|-4qog|-b0j0|j6480t
Prešov|presov||SK|1e4|2132|ai31|4jvu|j64bcj
Presque Isle|presque isle||US|10z|7ay|a126|-ekpi|j649ap
Pretoria|pretoria||ZA|kg|soeo|-5ica|61sz|j64mdh
Prey Veng|prey veng||KH|1e3|1l3k|2gm0|mkoo|j63zcv
Price|price||US|1s7|7xl|8hjy|-nr0k|j648mt
Prieska|prieska||ZA|18u|8o4|-6cur|4vdw|j64bih
Prijedor|prijedor||BA|1ji|28wq|9n2k|3kuw|j64iot
Prince Albert|prince albert||CA|1j3|qpd|behs|-mnz0|j64k1j
Prince George|prince george||CA|9r|1el2|bk0v|-qb9v|j64kzh
Prince Rupert|prince rupert||CA|9r|bck|bn3z|-rxms|j64mnx
Pristina|pristina||XK|1e9|9yxu|957v|4jbg|j64lod
Prizren|prizren||XK|1ea|3oaw|91ud|4g3x|j6458f
Probolinggo|probolinggo||ID|qw|3w60|-1nso|o92k|j64e15
Proddatur|proddatur||IN|33|48cr|35tc|gu90|j64fhl
Progreso|progreso||MX|1vq|10d0|4k81|-j7ve|j64jep
Progress|progress||RU|2t|42|anvk|rs4n|j64cot
Prokopyevsk|prokopyevsk||RU|u0|5wnz|bjw8|il24|j64j87
Proserpine|proserpine||AU|1f2|32g|-4dj6|vuh7|j64ij1
Providence|providence||US|1fu|rdc8|8ypi|-fb21|j64iz5
Provideniya|provideniya||RU|dw|1yg|dt3f|-114ma|j64kdt
Provo|provo||US|1s7|7n8o|8mk9|-nxei|j64iy3
Prudhoe Bay|prudhoe bay||US|26|1xg|f2dm|-vv52|j64man
Pskov|pskov||RU|1ec|4buu|ce7w|62lf|j64li1
Puca Urco|puca urco||PE|za|a|-i00|-fewv|j64b1l
Pucallpa|pucallpa||PE|1rl|6nry|-1skp|-fz46|j64lf1
Puducherry|puducherry|pondicherry|IN|1ed|4vgz|2k3a|h3z0|j64lzn
Puebla|puebla|puebla city|MX|1ee|1b1o8|4307|-l1qc|j64mv3
Pueblo|pueblo||US|ei|2ekj|87dg|-mfbw|j648iz
Puerto Acosta|puerto acosta||BO|x6|v7|-3blg|-etoz|j64huv
Puerto Aisén|puerto aisen||CL|v|683|-9qb3|-fkyg|j64jq7
Puerto Armuelles|puerto armuelles||PA|dj|ky3|1rw0|-hrfg|j64kd7
Puerto Baquerizo Moreno|puerto baquerizo moreno|baquerizo moreno|EC|ka|4ni|-6y0|-j7cw|j646al
Puerto Barrios|puerto barrios||GT|qj|17od|3d9z|-izl3|j64joz
Puerto Berrío|puerto berrio||CO|3c|q7z|1e04|-fy88|j64e4t
Puerto Cabello|puerto cabello||VE|bt|3q9c|28sg|-em04|j648w5
Puerto Deseado|puerto deseado||AR|1in|2jt|-a8fw|-e4hk|j64mpb
Puerto Escondido|puerto escondido||MX|19l|f1c|3edc|-ksyr|j64czt
Puerto Heath|puerto heath||BO|x6|a|-2og4|-epu2|j64hul
Puerto la Cruz|puerto la cruz||VE|3i|bprs|26h0|-dv2o|j6436v
Puerto Lempira|puerto lempira||HN|lk|3qw|39rg|-hydw|j64a6x
Puerto López|puerto lopez||CO|13b|cva|vk4|-fmyo|j646ep
Puerto Madryn|puerto madryn||AR|dv|1dt7|-960k|-dxuo|j647pl
Puerto Maldonado|puerto maldonado||PE|10i|1ftf|-2p80|-ettl|j64k91
Puerto Montt|puerto montt||CL|zd|3qqt|-8vzg|-fmqc|j64ml5
Puerto Natales|puerto natales||CL|10p|ffk|-b327|-fji5|j64jqb
Puerto Pinasco|puerto pinasco||PY|1e2|dw|-4uow|-cdws|j644xh
Puerto Plata|puerto plata||DO|1ef|2kih|48pa|-f5g6|j63xnh
Puerto Princesa|puerto princesa||PH|1bk|3d94|239j|pg8k|j64kgj
Puerto Quijarro|puerto quijarro||BO|1in|80o|-3t6s|-cdr8|j64hwj
Puerto San Julián|puerto san julian||AR|1in|1t7|-akeg|-eii7|j64l1v
Puerto Suárez|puerto suarez||BO|1in|gz4|-427s|-cedg|j64hxb
Puerto Vallarta|puerto vallarta||MX|qp|40e6|4fjn|-mk2q|j64cxz
Puerto Varas|puerto varas||CL|zd|j9a|-8uwk|-fn70|j646xt
Puerto Villamil|puerto villamil||EC|k4|1p4|-779|-jiaf|j646ah
Puerto Villarroel|puerto villarroel||BO|eb|1de|-3m64|-dvug|j647qp
Puerto Williams|puerto williams||CL|10o|1xg|-brv9|-ehqf|j64jqd
Pugachev|pugachev|pugachyov|RU|1iz|kle|b5ck|agi0|j64cd1
Pukatawagan|pukatawagan||CA|11m|bz|by1h|-lpri|j647gz
Pukë|puke||AL|1k5|50f|90bx|49f5|j63yp3
Pukekohe|pukekohe||NZ|55|kak|-7z1r|11hk9|j64n6p
Pula|pula||HR|qd|1bj3|9m7j|2yup|j64en7
Punakha|punakha||BT|1eh|3uw|5wua|j9e9|j63zml
Punata|punata||BO|eb|kb7|-3rf0|-e40w|j647qd
Pune|pune|poona|IN|10w|2s4xs|3yzs|fttd|j64myb
Puno|puno||PE|bc|2hxk|-3e61|-f0dp|j64azp
Punta Alta|punta alta||AR|e4|1855|-8c00|-db0g|j647sd
Punta Arenas|punta arenas||CL|10p|2ily|-be82|-f7dk|j64mkt
Punta del Este|punta del este|maldonado|UY|115|3eoo|-7htw|-brzw|j6412z
Punta Gorda|punta gorda||BZ|1qb|5z8|3g8b|-j19g|j64hl5
Punta Prieta|punta prieta||MX|61|en|6795|-ogwy|j64ctj
Puntarenas|puntarenas||CR|1ej|1826|24xi|-i6kw|j64e6h
Punto Fijo|punto fijo||VE|j5|514g|2ifk|-f1qs|j64juz
Puqi|puqi||CN|ox|4eb0|6dbo|oepc|j64er3
Puquio|puquio||PE|5b|83f|-35fc|-fvzo|j644vf
Puri|puri||IN|1ao|4b42|48xo|iet4|j64fjd
Purnia|purnia||IN|86|494l|5iym|ir00|j64gd3
Pursat|pursat|pouthisat|KH|1dw|14ho|2opl|m9tr|j64hqj
Put Lenina|put lenina||RU|1hd|8a|eooe|n3sg|j645pj
Putian|putian||CN|ju|82jy|5g7z|pid4|j64dwn
Putina|putina||PE|bc|69i|-3bd8|-evq4|j644u3
Putrajaya|putrajaya||MY|1jc|1gfw|mhg|lsqj|j64lrv
Puttalan|puttalan|puttalam|LK|1ek|z8d|1pze|h3xw|j63w3v
Puyang|puyang||CN|nx|ea4y|7ngs|on6w|j64etx
Puyo|puyo||EC|1c2|j75|-bfy|-gpr2|j640jd
Puzi|puzi||TW|d9|12kw|510z|prsj|j648ab
Pyatigorsk|pyatigorsk||RU|1mb|328h|9g4g|98hg|j6459l
Pyay|pyay||MM|5y|2wek|416t|kenm|j64k7l
Pyongsan|pyongsan|pyongyang|KP|p4|1f4k|87t3|r37e|j64di1
Pyongyang|pyongyang|p yongyang|KP|1bg|1yqao|8d3a|qybb|j64mvb
Pyu|pyu||MM|5y|v5u|3ykr|ko4b|j64k7j
Qaanaaq|qaanaaq||GL|1eq|h4|glv7|-euyy|j64lwv
Qabala|qabala||AZ|1ep|95n|8s7q|a96i|j63z3f
Qacha's Nek|qacha s nek||ZA|i0|jqd|-6gdx|65gs|j63w0p
Qairouan|qairouan|kairouan|TN|s4|33ii|7nb8|25xk|j649fj
Qal at Bishah|qal at bishah|bisha governorate|SA|1wu|1w4j|4adz|94oz|j64515
Qala i Naw|qala i naw|qal eh ye now|AF|5s|2b9|7hxi|dj51|j63z53
Qalat|qalat||AF|1vv|9en|6vs3|ec3o|j64hph
Qaminis|qaminis||LY|7r|44k|6sam|4afv|j64de7
Qapshaghay|qapshaghay|kapchagay|KZ|2e|wjb|9em4|ginz|j64g4j
Qaqortoq|qaqortoq||GL|vj|2hk|d0l5|-9v7w|j64jqp
Qaraghandy|qaraghandy|karaganda|KZ|1er|9om0|aowy|fo5q|j64mlz
Qaratau|qaratau|karatau|KZ|1wf|t89|997y|f3o8|j64gat
Qarazhal|qarazhal|karazhal|KZ|1er|h3u|aakd|f6an|j64g2n
Qardho|qardho||SO|6u|119|21b0|ajd8|j64cip
Qarqaraly|qarqaraly|karkaraly|KZ|1er|6bn|ald5|g6ah|j64js5
Qarshi|qarshi|karshi|UZ|te|8a49|8bxc|e3ps|j649rz
Qasigiannguit|qasigiannguit||GL|1eq|119|er0h|-ayw9|j64ftd
Qasr Farafra|qasr farafra|farafra|EG|1y|3uw|5sun|5zsi|j64ehf
Qasserine|qasserine|kasserine|TN|tj|1r9f|7jgc|1w4s|j649f5
Qazaly|qazaly|kazaly|KZ|1fb|52u|9t3w|db83|j64ktt
Qazvin|qazvin||IR|1es|9yg7|7rv0|apsw|j64kub
Qena|qena||EG|1eu|6h1n|5ls1|70gw|j64ehv
Qeqertasuaq|qeqertasuaq|qeqertarsuaq|GL|1eq|a|euai|-bhb8|j64jqx
Qingan|qingan|qing an|CN|nw|151y|a1nz|rbvy|j646oj
Qingdao|qingdao||CN|1js|1pff4|7qhj|psgh|j64lst
Qinggang|qinggang||CN|nw|1diu|a09g|r0zs|j646o3
Qingyuan|qingyuan||CN|m6|f5b1|52vg|o859|j64dy7
Qinhuangdao|qinhuangdao||CN|nu|lhx4|8k4b|pmz9|j64jkv
Qinzhou|qinzhou||CN|m7|59c0|4pdc|na48|j64dvb
Qiqihar|qiqihar|qiqihaer|CN|nw|z67c|a5bx|qkp4|j64mjz
Qitaihe|qitaihe||CN|nw|9np5|9te8|s1n8|j64jnt
Qom|qom||IR|1ev|kurs|7fdk|ax49|j64ku7
Qomsheh|qomsheh|shahreza|IR|iq|2ja5|6v03|b45h|j64g4t
Qoqon|qoqon|kokand|UZ|je|7i28|8ot8|f7dk|j649s3
Quảng Ngãi|quang ngai||VN|1ez|5cwg|38wg|nbqk|j64a01
Quảng Trị|quang tri||VN|1f1|1k42|3l8w|mz5s|j64a05
Quanzhou|quanzhou||CN|ju|vcuw|5c58|peyc|j64lpb
Quaraí|quarai||BR|1g0|hx9|-6iew|-c3nb|j6478z
Quchan|quchan||IR|1fn|34aj|7ycu|cjef|j64g8t
Queanbeyan|queanbeyan||AU|57|p5m|-7ksq|vzbl|j64i9f
Québec|quebec|quebec city|CA|1fa|ddm9|a1f4|-f9qg|j64mop
Queenstown|queenstown||ZA|i0|2999|-6u50|5reo|j64bux
Queenstown|queenstown||NZ|1ay|ct4|-9neb|105w3|j64n5v
Queenstown|queenstown||AU|1oy|1tc|-90pp|v72k|j64int
Quelimane|quelimane||MZ|1w3|41t0|-3tyo|7wn8|j64lhl
Quellón|quellon||CL|zd|5f9|-98k4|-frwg|j64ft3
Querétaro|queretaro|santiago de queretaro|MX|1f3|klig|4f74|-lijv|j64jej
Quesada|quesada||CR|25|o02|27pl|-i3jk|j64e6p
Quesnel|quesnel||CA|9r|an0|bctp|-q935|j64h0l
Quetta|quetta||PK|6c|gglc|6h6z|ed5i|j64lgf
Quetzaltenango|quetzaltenango|quezaltenango|GT|1f4|cbvj|36fg|-jm68|j64luz
Quezon City|quezon city||PH|13c|1n6yg|351k|pxvg|j64ckv
Qui Nhon|qui nhon||VN|av|h9d6|2ybs|nefs|j64jyz
Quibala|quibala||AO|fd|6vn|-2asg|37l4|j64hrz
Quibdó|quibdo||CO|dp|1zl8|17wo|-gfig|j64ead
Quiemo|quiemo|qiemo town|CN|1v2|1elg|868q|ibz9|j64ep3
Quillacollo|quillacollo||BO|eb|4v70|-3q9c|-e7f4|j647ql
Quillota|quillota||CL|1sl|1phi|-71pc|-f9ug|j646vn
Quilpie|quilpie||AU|1f2|fk|-5pdi|ux1g|j64k63
Quime|quime||BO|x6|34d|-3n0o|-eeo8|j64855
Quincy|quincy||US|pl|10ck|8k5c|-jlbl|j6491p
Quinhagak|quinhagak||US|26|6y|ct10|-ypcm|j649j3
Quipungo|quipungo||AO|os|56|-36fb|349o|j64htx
Quirihue|quirihue||CL|1x8|51d|-7rxs|-fjn8|j646x5
Quissico|quissico|zavala|MZ|px|xm|-5as9|7g98|j64btv
Quito|quito||EC|1d5|10gi0|-1n6|-gtq4|j64min
Quixadá|quixada||BR|c8|1228|-12ck|-8d2w|j647dz
Qulan|qulan|kulan|KZ|1wf|a4o|976c|fkzu|j64gaj
Qulsary|qulsary|kulsary|KZ|54|smn|a2ix|bksl|j64ktx
Qunghirot|qunghirot|qo ng irot|UZ|sy|18ke|98c0|cmh4|j649rd
Qurghonteppa|qurghonteppa|bokhtar|TJ|uh|6oeu|83yd|eqn5|j6446j
Qusmuryn|qusmuryn||KZ|1ew|67l|b8ro|dugg|j64g0x
Quzhou|quzhou||CN|1wg|7xhs|67jc|ph7g|j64exh
Qyzylorda|qyzylorda|kyzylorda,qyzlorda|KZ|1fb|6fhc|9log|e14q|j64ly5
Raba|raba||ID|19f|29v9|-1t78|pgeq|j64lo3
Rabat|rabat||MA|1fd|10jl4|7ajh|-1gr0|j64mdt
Rabaul|rabaul||PG|hx|68a|-wg7|wly2|j64lh7
Rạch Giá|rach gia||VN|va|6fhc|25a2|miw2|j64a0x
Racine|racine||US|1uw|2tl2|95ot|-itk6|j6495t
Radisson|radisson||CA|1fa|7i|bizw|-gmw6|j64h6f
Rafaela|rafaela||AR|1io|1wg9|-6p4k|-d6jc|j647yj
Rafha|rafha|rafha governorate|SA|1f|1dyr|6cju|9blw|j64b8h
Ragusa|ragusa||IT|1ka|1h7g|7wyc|35no|j64681
Rahim Yar Khan|rahim yar khan||PK|1ei|7kj7|63ai|f2eg|j6455j
Raichur|raichur||IN|t6|5gy0|3h2w|gkvi|j64fk7
Raipur|raipur||IN|d5|ir5k|4jv5|hhvv|j64lzh
Rajahmundry|rajahmundry|rajamahendravaram|IN|33|6j6s|3nen|hj3g|j64fid
Rajapalaiyam|rajapalaiyam|rajapalayam|IN|1of|7xhj|20os|gmm0|j64ged
Rajbiraj|rajbiraj||NP|1h1|pid|5oqd|il8l|j63vvd
Rajkot|rajkot||IN|fo|r080|4s5s|f6a5|j64l8l
Rajshahi|rajshahi||BD|1ff|hd00|583d|iznz|j64m6t
Raleigh|raleigh||US|18e|oxrv|7odo|-gutr|j64m9d
Ramallah|ramallah||PS||izb|6u5x|7jni|j6407v
Ramechhap|ramechhap||NP|qs|bko|5uuk|ig92|j63vud
Ramla|ramla||IL|mx|1d9w|6u9r|7h17|j63y3n
Rampur|rampur||IN|1sa|6cpu|66ca|gxre|j64gbp
Rancagua|rancagua||CL|yi|4zzo|-7bno|-f5u0|j64krb
Ranchi|ranchi||IN|r2|mdk0|50c8|iae9|j64lzd
Rangpur|rangpur||BD|1ff|64cc|5ios|j4w0|j64k7f
Rankin Inlet|rankin inlet||CA|19e|1wo|dgp3|-jqm1|j64l01
Ranong|ranong||TH|1fh|iy9|24v8|l53g|j63uv3
Raoul Island Station|raoul island station||NZ|1lp|0|-69o1|-124w0|j64n7j
Rapid City|rapid city||US|1ln|1ktc|9g4m|-m4j6|j64iyf
Ras al Khaymah|ras al khaymah|ra s al khaymah,ras al khaimah|AE|1fj|3g41|5j0b|bzno|j649qd
Rashid|rashid|rosetta|EG|s0|49xx|6qr0|6iho|j64ehb
Rasht|rasht||IR|ky|cqse|7zt4|amy4|j64kuj
Rason|rason|sonbong|KP|nb|1ayo|92oh|ry6z|j64din
Ratchaburi|ratchaburi||TH|1fk|2ak4|2whn|le87|j649vz
Ratlam|ratlam||IN|10h|6l25|5068|g2xo|j64gdv
Ratnapura|ratnapura||LK|1fl|10wo|1fn6|h89g|j63w47
Raton|raton||US|175|5gh|7wpa|-mdv3|j648l1
Raub|raub||MY|1bh|uvs|t9j|lttj|j64bhb
Raurkela|raurkela|rourkela|IN|1ao|dew7|4rj4|i6jw|j64fjl
Ravenna|ravenna||IT|ih|2vvr|9ir0|2mag|j64dq3
Ravensthorpe|ravensthorpe||AU|1uo|ul|-774l|pq6l|j64i75
Rawalpindi|rawalpindi||PK|1ei|13tn4|779v|fnkd|j64j4x
Rawlins|rawlins||US|1uz|6l1|8ygj|-mzfb|j648n5
Rawson|rawson||AR|dv|kbj|-9a3s|-dybc|j64m2z
Rayevskiy|rayevskiy|rayevsky|RU|72|fh8|bl6q|brth|j64c6j
Rayong|rayong||TH|1fm|skr|2pry|lphr|j649x5
Razgrad|razgrad||BG|1fo|tjh|9bws|5or4|j63zkf
Reading|reading||GB|1bc|7xcc|b158|-7k8|j644lf
Recife|recife||BR|1cj|2694o|-1qap|-7hfc|j64mzp
Reconquista|reconquista||AR|1io|1xl4|-68ub|-cs9g|j64hiv
Red Deer|red deer||CA|29|1lrd|b7ai|-oe34|j64kz3
Red Devil|red devil||US|26|p|d8ju|-xptx|j64jxn
Red Lake|red lake||CA|1aa|1d1|axs1|-k40t|j64h3n
Redding|redding||US|bb|224a|8p66|-q8de|j648h5
Regensburg|regensburg||DE|7i|3itj|ai8s|2lio|j64eml
Reggane|reggane||DZ|j|pfy|5q0o|1aa|j64l3x
Reggio di Calabria|reggio di calabria|reggio calabria|IT|b8|3v5t|863i|3cou|j6467n
Regina|regina||CA|1j3|3rxz|at9w|-mf8a|j64mnp
Registro|registro||BR|1nj|153t|-58ys|-a94w|j6480x
Rehoboth|rehoboth||NA|nf|jgj|-4zxo|3nsg|j64dk3
Reims|reims||FR|cq|47o5|ak0o|v3g|j64fq3
Remanso|remanso||BR|5z|ta1|-222k|-90x8|j64gwn
Rennes|rennes||FR|9o|4hjz|ab54|-cvw|j64jpv
Reno|reno||US|16z|71jd|8h0k|-pojc|j64l9t
Réo|reo||BF|1if|syn|2n5z|-j19|j63zwj
Requena|requena||PE|za|dw0|-1348|-fuak|j64b23
Resistencia|resistencia||AR|ck|8aqe|-5vvs|-cn64|j64l2j
Reșița|resita||RO|bu|1sak|9pii|4ovl|j64axj
Resolute|resolute||CA|19e|6y|g09d|-kc94|j64mo3
Retalhuleu|retalhuleu||GT|1fs|sa8|3463|-jndu|j63xi5
Revelstoke|revelstoke||CA|9r|5x0|axit|-pbwp|j64h1h
Reyes|reyes||BO|ia|5ow|-32ew|-eftw|j64hc1
Reykjavík|reykjavik||IS|1n9|3k90|dqzg|-4pd8|j64mbf
Reynosa|reynosa||MX|1oc|aori|5l8g|-l2hk|j645un
Rēzekne|rezekne||LV|y0|tl0|c3yg|5ury|j6452p
Rhinelander|rhinelander||US|1uw|8uz|9s5r|-j5wp|j6495n
Ribeirão Preto|ribeirao preto||BR|1nj|btcz|-4jck|-a924|j64m3p
Riberalta|riberalta||BO|ia|1l3y|-2cqu|-e614|j64mpl
Richfield|richfield||US|1s7|5vp|8b65|-o0u9|j641ld
Richland|richland||US|1u8|ymd|9x6u|-pkgf|j648e1
Richmond|richmond||US|1tg|jjpc|81r4|-glmf|j64lbj
Richmond|richmond||US|pv|y9c|8jbl|-i70n|j642ob
Richmond|richmond||AU|176|apk|-7797|wb48|j64ibv
Richmond|richmond||AU|1f2|88|-4fuj|uof9|j64ilx
Rida|rida||YE|17|ywh|33c7|9lxx|j649pz
Ridder|ridder||KZ|hw|17sk|asjm|hwel|j64g3t
Riga|riga||LV|1fy|fwz0|c7fg|55yg|j64mhn
Rigolet|rigolet||CA|179|3g|bm12|-cizd|j64l1n
Rijeka|rijeka||HR|1e6|3nxs|9pro|33hw|j646gz
Rimnicu Vilcea|rimnicu vilcea|ramnicu valcea|RO|1tu|2azq|9o2k|5852|j63uqx
Rimouski|rimouski||CA|1fa|rgg|adpt|-eoof|j64h55
Rinconada|rinconada||AR|rg|55w|-4t3d|-e6jm|j64hgb
Rio Branco|rio branco||BR|9|5isq|-24wi|-ej5c|j64m05
Río Bueno|rio bueno||CL|zg|bxc|-8n9k|-fmyo|j646wt
Rio Claro|rio claro||BR|1nj|3v03|-4sx0|-a6z4|j647yx
Río Colorado|rio colorado||AR|x5|8vf|-8co2|-dqgx|j64l2b
Río Cuarto|rio cuarto||AR|fn|3an1|-73ms|-dsj0|j64k31
Rio de Janeiro|rio de janeiro||BR|1g1|6zstc|-4wvj|-99ji|j64n43
Río Gallegos|rio gallegos||AR|1in|1u4k|-b2el|-eu2u|j64mpd
Rio Grande|rio grande||BR|1g0|40xq|-6van|-b65s|j64gsb
Rio Grande|rio grande||AR|1pu|nzr|-bj22|-eida|j64l1z
Rio Largo|rio largo||BR|24|3ec1|-215c|-7ojk|j647eh
Rio Negro|rio negro||BR|1bw|1em5|-5le0|-ao6k|j647bd
Río Tercero|rio tercero||AR|fn|1571|-6was|-dqr4|j64hg1
Rio Verde|rio verde|rioverde|MX|1i2|1hpp|4p7o|-lfg8|j645u7
Rio Verde|rio verde||BR|l7|11a6|-3thw|-awz8|j64hcl
Río Verde|rio verde||CL|10o|9y|-ba90|-fbfu|j646uf
Riobamba|riobamba||EC|dd|3p2o|-cvw|-guv8|j64kmt
Riohacha|riohacha||CO|x2|2urm|2h1n|-fmks|j64e5v
Rivas|rivas||NI|17f|on9|2g9w|-ie6w|j64aw5
Rivera|rivera||UY|1g5|4abk|-6mf8|-bwpc|j648az
Rivercess|rivercess|river cess|LR|1g3|1zm|1662|-21wk|j63wlf
Riverside|riverside||US|bb|6dle|79wb|-p5uk|j641el
Riverton|riverton||US|1uz|8vo|980a|-n8dq|j648nb
Rivière-du-Loup|riviere du loup||CA|1fa|cnn|a931|-ewit|j647ln
Rivne|rivne||UA|1g7|5gua|auk6|5mkg|j649nh
Riyadh|riyadh|ar riyadh|SA|3v|2np7s|5a58|a0vw|j64n31
Rize|rize||TR|1g8|5zmi|8sio|8oo3|j644hp
Rizhao|rizhao||CN|1js|ijfs|7lds|plok|j64evx
Roanne|roanne||FR|1fv|1kkj|9v71|vdn|j646a7
Roanoke|roanoke||US|1tg|48wr|7zl4|-h4u0|j6494n
Roatán|roatan||HN|qa|5sq|3i04|-ijl2|j640bp
Robertsport|robertsport||LR|lq|98h|1g3x|-2fpy|j64kjn
Roboré|robore||BO|1in|7qs|-3xfj|-ct40|j64hwf
Rocha|rocha||UY|1g9|kqi|-7e2m|-bn8i|j64ix3
Rochester|rochester||US|178|g6k8|994c|-gmxn|j64l6l
Rochester|rochester||US|13m|2bq7|9fod|-jti1|j648bl
Rock Hill|rock hill||US|1ll|20ys|7hlo|-hd8c|j6491d
Rock Island|rock island||US|pl|3jvk|8w5y|-jeki|j642nj
Rockford|rockford||US|pl|5hii|925l|-j39l|j642mv
Rockhampton|rockhampton||AU|1f2|1et6|-509z|w9f4|j64m6h
Rocky Mount|rocky mount||US|18e|1915|7pas|-go8k|j642rv
Rodeo|rodeo||AR|1i0|jh|-6h58|-ethk|j64hah
Rodos|rodos|rhodes|GR|190|17yh|7t6k|61rl|j64fvx
Roebourne|roebourne||AU|1uo|ev0|-4gd1|p3t1|j64i7f
Rohtak|rohtak||IN|ni|6ssd|66zs|gew8|j646rp
Roi Et|roi et||TH|1gb|ucg|3fum|m7t2|j63v7d
Rolim de Moura|rolim de moura||BR|1gc|ix0|-2iie|-d8pa|j64gop
Roma|roma||AU|1f2|48o|-5oxm|vw2r|j64k6d
Rome|rome||IT|y3|1zke0|8zab|2ob1|j64n3d
Rondonópolis|rondonopolis||BR|12q|39zk|-3j2v|-bpls|j64grt
Rongzhag|rongzhag|danba|CN|1k9|1i0g|6mtc|lue7|j64esb
Rørvik|rorvik||NO|186|20n|dwiw|2egl|j64525
Ros Comain|ros comain|roscommon|IE|1gf|3r0|bhu5|-1r55|j63wff
Rosario|rosario||AR|1io|ps8o|-728k|-d04b|j64m3j
Rosário|rosario||BR|11v|58u|-moo|-9hig|j6474j
Rosario|rosario|puerto del rosario|PY|1i7|3yb|-58f8|-c8l4|j64b45
Rosário do Sul|rosario do sul||BR|1g0|sc1|-6hes|-brrk|j6479l
Roseau|roseau||DM|1h6|i08|3a2a|-d5ny|j64lqv
Roseburg|roseburg||US|1ai|nin|99h4|-qftl|j648lb
Rosenheim|rosenheim||DE|7i|1zm1|a97r|2lmd|j64emp
Roskilde|roskilde||DK|1ku|y65|bxec|2l8h|j6473f
Roslavl|roslavl||RU|1kz|17yj|bkad|71jw|j64byl
Rosso|rosso||MR|1qt|10f7|3ji0|-3e0f|j64krn
Rostock|rostock||DE|131|4cp4|bl7k|2lr0|j64fzb
Rostov|rostov|rostov na donu,rostov on don|RU|1gg|mjq8|a4ha|8ier|j64lih
Rostov|rostov||RU|1vd|q2z|c99w|8g1n|j64c0t
Roswell|roswell||US|175|zkg|75o9|-mei1|j648kb
Rothera Station|rothera station|rothera research station|AQ||3m|-ehc0|-eln7|j64iub
Rotorua|rotorua||NZ|55|17d4|-8685|11rxv|j64n5h
Rotterdam|rotterdam||NL|1wq|ljgo|b4mr|yjw|j64j43
Rouen|rouen||FR|nr|bexb|aleo|8c0|j64fpl
Rouyn-Noranda|rouyn noranda||CA|1fa|ize|acas|-gxto|j647n7
Rovaniemi|rovaniemi||FI|xw|qu5|e948|5ifb|j64lxv
Roxas|roxas||PH|bp|278g|2he5|qb5j|j64kgh
Rrëshen|rreshen||AL|ye|7rk|8yeh|48wn|j63yxh
Rubtsovsk|rubtsovsk||RU|2h|3ga1|b1j4|hemc|j64j83
Rudniy|rudniy|rudny|KZ|1ew|2nog|bcl3|dj44|j64ly3
Ruhengeri|ruhengeri||RW|18s|1uvx|-bkk|6cmk|j64aw1
Rumbek|rumbek||SS|xn|or7|1ggw|6d1d|j64kah
Rundu|rundu||NA|to|18vw|-3u9s|48e3|j64ki5
Rurrenabaque|rurrenabaque||BO|x6|92d|-33ko|-ehao|j6484n
Rusanovo|rusanovo||RU|4a|a|f4ql|c2yz|j64ke3
Ruse|ruse||BG|1gi|3y6m|9edl|5ket|j64i2f
Russas|russas||BR|c8|ug9|-1248|-8520|j647dl
Rustavi|rustavi||GE|wg|3d6v|8wrc|9nlw|j64fw5
Rustenburg|rustenburg||ZA|18n|3k2g|-5hx0|5u6o|j64kch
Rutana|rutana||BI|1gj|g4d|-uby|6ffe|j63zoz
Ruteng|ruteng||ID|19g|15nc|-1ug6|ptju|j64kmj
Ruyigi|ruyigi||BI|1gl|toa|-quy|6hd4|j63zpd
Ruzayevka|ruzayevka||RU|14i|121r|bl5v|9mn0|j645gj
Ryazan|ryazan||RU|1gn|b5d9|bpg8|8ihc|j64lip
Rybinsk|rybinsk||RU|1vd|4n84|cfx3|8bjc|j64c0n
Rzeszów|rzeszow||PL|1mh|59km|aqch|4pr4|j64dgd
Rzhev|rzhev||RU|1rd|1cxi|c232|7cvf|j645ch
's-Hertogenbosch|s hertogenbosch||NL|17z|2vso|b2sh|150v|j63vnb
Saarbrücken|saarbrucken||DE|1gu|gi4x|ak0o|1hs4|j64emd
Sabanalarga|sabanalarga||CO|4y|1gvr|2a3k|-g234|j646e3
Sabaneta|sabaneta||DO|1it|cn0|46i2|-fai2|j63x47
Sabaya|sabaya||BO|1ap|fx|-42qb|-ennd|j64hvd
Sabha|sabha||LY|1gw|25cp|5sl9|33d9|j64mlj
Sabinas Hidalgo|sabinas hidalgo||MX|19c|oq7|5ojw|-lgzs|j645tp
Sabzewar|sabzewar|sabzevar|IR|1fn|4uiv|7rh4|ccoc|j64kun
Sacramento|sacramento||US|bb|ydnk|89nu|-q1a8|j64m8h
Sadah|sadah|sa dah|YE|1gt|29fq|3mpi|9eci|j64jxd
Sadiqabad|sadiqabad||PK|1ei|42ic|62da|f14m|j64beh
Safford|safford||US|48|88c|71ci|-nii5|j641az
Safi|safi||MA|hb|7kqs|6xds|-1zao|j64lhh
Safonovo|safonovo||RU|1kz|zzh|btih|74ap|j64byt
Sagaing|sagaing||MM|1h0|1or7|4ots|kkg4|j64043
Sagar|sagar||IN|10h|719s|5414|gvn0|j64gdz
Sagastyr|sagastyr||RU|1hd|a|fq6r|r4sk|j64jcj
Saginaw|saginaw||US|13e|2lnn|9b0z|-hzro|j64jx7
Sagua la Grande|sagua la grande||CU|1tc|1bw9|4vzu|-h5tz|j64ecd
Saharanpur|saharanpur||IN|1sa|ae4p|6f90|gmdo|j64lzb
Sahiwal|sahiwal||PK|1ei|51v3|6knx|fo4u|j64555
Saida|saida|sidon|LB|1lv|3q6e|76z2|7kwo|j64611
Saïda|saida||DZ|1j8|31qd|7gtw|12w|j64i0f
Saidpur|saidpur||BD|1ff|4z69|5j2s|j2q8|j64ipb
Saidu|saidu|saidu sharif|PK|15m|13vfa|7g4s|fi98|j64j57
Saint Ann's Bay|saint ann s bay|st ann s bay|JM|1h3|ajr|3y86|-gjob|j63x27
Saint-Étienne|saint etienne||FR|1fv|5p04|9qjk|xso|j64e2x
Saint Gallen|saint gallen|st gallen|CH|1ig|1igc|a5x2|208k|j63uil
Saint George's|saint george s|st george s|GD||q12|2kzy|-d8eg|j64m7j
Saint-Georges|saint georges||CA|1fa|k6d|9vub|-f59n|j64h5b
Saint John|saint john||CA|171|1vsh|9pa6|-e5un|j64h6j
Saint John's|saint john s||AG||re3|3o30|-d98k|j64m7t
Sakakah|sakakah|sakakah governorate|SA|1k|2r0s|6fhc|8lo5|j640gh
Sakarya|sakarya|adapazari|TR|1hc|65ab|8qk3|6ikg|j63tn5
Sakata|sakata||JP|1v7|25i6|8cb4|tz39|j64lud
Sakhon Nakhon|sakhon nakhon|sakon nakhon|TH|1hf|1mtp|3ogv|mblz|j649y3
Saki|saki|shaki|AZ|1gq|1e4o|8tub|a3yx|j64hop
Salalah|salalah||OM|gi|4db9|3ndb|blbo|j64j8b
Salamá|salama||GT|63|uv4|38ja|-jcv8|j63xhn
Salamanca|salamanca||MX|m5|48es|4eq0|-lov4|j64d0x
Salamanca|salamanca||ES|c1|3h9t|8s4o|-17r0|j649dd
Salamanca|salamanca||CL|ew|fli|-6t7o|-f7oo|j64fs3
Salatiga|salatiga||ID|qv|3rsw|-1kef|nojp|j64dzn
Salavat|salavat||RU|72|3fdh|bft3|bzk4|j64c6x
Salaverry|salaverry||PE|x4|7rm|-1rfc|-gxho|j64k9h
Salcedo|salcedo||DO|o0|yyb|45k6|-f3c7|j63xox
Saldanha|saldanha||ZA|1up|1gos|-72pg|3uck|j64kc1
Sale|sale||AU|1t8|hcm|-8620|viq0|j64ihn
Salekhard|salekhard||RU|1v9|tc9|e9dy|e9ys|j64j6x
Salem|salem||IN|1of|ipm0|2i27|gr85|j64lzp
Salem|salem||US|12j|76vp|943t|-f6xr|j642a3
Salem|salem||US|1ai|4wpe|9mo1|-qd9b|j64l9z
Salerno|salerno||IT|bg|kgbd|8pw4|35yr|j64drd
Salgótarján|salgotarjan||HU|19k|ul4|ab6i|48z8|j63u6j
Salgueiro|salgueiro||BR|1cj|wiw|-1q6s|-8dxg|j64hkh
Salima|salima||MW|1hj|1ix9|-2ycl|7dot|j64bth
Salina|salina||US|sr|1127|8bkn|-kx54|j648p5
Salina Cruz|salina cruz||MX|19l|1qjr|3gqv|-kekg|j64czn
Salinas|salinas||US|bb|3cz4|7v1i|-q2ld|j64ju3
Salinas|salinas||EC|mb|xue|-gz4|-hcug|j646az
Salinópolis|salinopolis||BR|1bz|vmu|-4pb|-a5a0|j64gnl
Salisbury|salisbury||US|18e|vwo|7n8k|-h8y1|j642s3
Salluit|salluit||CA|1fa|2y|dbsy|-g7sj|j647mn
Salmon|salmon||US|ph|2s1|9okt|-oeti|j648dt
Salsk|salsk||RU|1gg|1b2g|9ymf|8wjg|j64c2h
Salt Lake City|salt lake city||US|1s7|kpdc|8qmy|-nzo8|j64m8p
Salta|salta||AR|1hk|azla|-5b8a|-e0ra|j64m3b
Saltillo|saltillo||MX|e9|g5sg|5g5n|-lndh|j64jdv
Salto|salto||UY|1hl|29ju|-6q7j|-cfaf|j64jt5
Salvador|salvador||BR|5z|22o9s|-2s28|-88xf|j64mzh
Salyan|salyan||NP|1fi|bko|62r0|hm4p|j63utn
Salzburg|salzburg||AT|1hm|4f5z|a8wp|2sm8|j64i31
Samaipata|samaipata||BO|1in|29a|-3wa0|-do1w|j64863
Samalut|samalut||EG|1t|39cx|62d8|6kyk|j64egt
Samaná|samana||DO|1ho|8tk|448o|-euyw|j63xu7
Samandagi|samandagi|samandag|TR|nl|2092|7qoj|7p9h|j64afj
Samara|samara|kuybyskev|RU|1hq|odbc|begy|aqyd|j64men
Samarinda|samarinda||ID|sa|coys|-3uw|p3xo|j64kkn
Samarkand|samarkand|samarqand|UZ|1hr|f6ao|8i3g|ecju|j64max
Samarra|samarra||IQ|1hg|3eb0|7buc|9eji|j640o5
Sambalpur|sambalpur||IN|1ao|6nus|4lo0|hzx1|j64fjh
Sambava|sambava||MG|3e|xjd|-322u|ar36|j64bnz
Same|same||TZ|uv|dgv|-veg|831s|j64atf
Sampit|sampit||ID|s9|1zja|-jjl|o7j0|j64fbx
Samsun|samsun||TR|1ht|d263|8uio|7sfh|j64ldt
Samut Prakan|samut prakan||TH|1hu|8c3c|2wzp|lkbn|j649w3
Samut Sakhon|samut sakhon||TH|1hv|1czu|2wg0|lhpw|j63v33
Samut Songkhram|samut songkhram||TH|1hw|r21|2vhu|lfm2|j63v3x
San|san||ML|1nk|vxm|2umk|-11t4|j64d6h
San Andrés|san andres||CO||18y9|2oxh|-hibr|j640u1
San Angelo|san angelo||US|1ph|1w3k|6qs0|-liz3|j648tz
San Antonio|san antonio||US|1ph|vkko|6bjh|-l43p|j64m93
San Antonio|san antonio||CL|1sl|28h0|-7797|-fcjo|j64fsd
San Antonio de los Baños|san antonio de los banos||CU|x3|wys|4wmn|-hokf|j646ev
San Antonio de los Cobres|san antonio de los cobres||AR|1hk|334|-56lh|-e7yk|j64hhb
San Antonio Oeste|san antonio oeste||AR|1fc|6jw|-8qap|-dx11|j64hfl
San Bernardino|san bernardino|riverside san bernardino|US|bb|11eg8|7baf|-p53w|j64l6h
San Bernardo|san bernardo||CL|1fq|5aei|-779c|-f5iw|j646v7
San Borja|san borja||BO|ia|f5k|-36ck|-ebtg|j64hc5
San Carlos|san carlos||VE|ee|1nk8|22is|-ep8s|j6408p
San Carlos|san carlos||NI|17f|adn|2ec6|-i64v|j640ct
San Carlos|san carlos||BO|1in|4wh|-3q9c|-dnqs|j6486d
San Carlos|san carlos||PH|16s|4wh|29eo|qg08|j64ck3
San Carlos del Zulia|san carlos del zulia||VE|1wr|232g|1xiw|-fexs|j648w1
San Cristóbal|san cristobal||VE|1rg|9eku|1nyc|-fhhg|j64m95
San Cristóbal|san cristobal||DO|1hx|3auw|3y3k|-f0yq|j63xut
San Cristobal de Las Casas|san cristobal de las casas||MX|d8|4011|3l8s|-juri|j645zf
San Diego|san diego||US|bb|1qi00|7198|-p46j|j64mt7
San Felipe|san felipe||VE|1vc|1n8e|27r4|-eqg4|j64095
San Felipe|san felipe||CL|1sl|19r2|-70p8|-f5og|j646vd
San Felipe|san felipe||MX|61|g0e|6ndt|-om6o|j64ctn
San Fernando|san fernando||TT|1hy|3k47|27bp|-d682|j64395
San Fernando|san fernando||CL|yi|1ave|-7etk|-f7rg|j646xn
San Fernando|san fernando||MX|1oc|mib|5bqw|-l1eo|j64cxp
San Fernando de Apure|san fernando de apure|san fernado de apure|VE|3n|2mod|1oyg|-egln|j64iyz
San Francisco|san francisco|san francisco oakland|US|bb|21y1c|83fg|-q8ks|j64n07
San Francisco|san francisco||AR|fn|19km|-6qik|-db38|j647ut
San Francisco de Macorís|san francisco de macoris||DO|hd|39p6|44x4|-f21w|j646qz
San Francisco Gotera|san francisco gotera||SV|14h|cgo|2xpk|-ivs8|j63wxp
San Gabriel|san gabriel||EC|bw|cea|4pg|-gom8|j646dv
San Ignacio|san ignacio|san ignacio de velasco|BO|1in|jlb|-3ib4|-d2dc|j64hwn
San Javier|san javier||BO|1in|38y|-3how|-de94|j64hwx
San Jose|san jose||US|bb|zr1c|7ztn|-q47r|j64m8f
San José|san jose||CR|1hz|riqo|24oa|-i0t8|j64mip
San Jose|san jose|puerto san jose|GT|ip|ee7|2zk5|-jgrs|j64fcn
San Jose|san jose|san jose de chiquitos|BO|1in|73v|-3tqc|-d0zc|j64l3t
San José de Mayo|san jose de mayo||UY|1hz|s6p|-7d1o|-c5ks|j64ix1
San José del Guaviare|san jose del guaviare|san jose del guavuare|CO|13b|h2w|jtw|-fkhs|j646el
San Juan|san juan||PR||1h4qh|3ya8|-e69g|j64mrx
San Juan|san juan||AR|1i0|9ky0|-6rfw|-eopc|j64m2x
San Juan|san juan|san juan de la maguana|DO|1i0|1kae|414p|-f9md|j64kmv
San Juan Bautista|san juan bautista|san juan baptista|PY|13r|62y|-5pv4|-c8z0|j644yd
San Juan De Los Morros|san juan de los morros||VE|mj|1vp7|24ea|-efpg|j6409l
San Juan de Nicaragua|san juan de nicaragua|greytown|NI|17f|rs|2c9g|-hxu0|j64awb
San Juan del Río|san juan del rio||MX|1f3|35uv|4d94|-lfls|j645yj
San Juan del Sur|san juan del sur||NI|17f|60e|2et0|-iei0|j644ph
San Justo|san justo||AR|1io|7ev|-6lit|-czgp|j64hil
San Lorenzo|san lorenzo||PY|4q|apsw|-5fiw|-cbts|j644xz
San Lorenzo|san lorenzo||AR|f2|10qy|-60z4|-clh0|j647xn
San Lorenzo|san lorenzo||EC|is|fld|9sw|-gwhl|j64e77
San Lorenzo|san lorenzo|san lorenzo chico|BO|1os|2bc|-4lqn|-dvro|j6486h
San Luis|san luis||AR|1i1|99km|-74y0|-e7yk|j64k2z
San Luis|san luis||GT|1co|2u7q|3h00|-j64g|j646q7
San Luis Obispo|san luis obispo||US|bb|1ega|7k8w|-pv0a|j648gt
San Luis Potosí|san luis potosi||MX|1i2|l9fk|4r2v|-lnc3|j64lm3
San Marcos|san marcos||US|1ph|1iar|6ekv|-kzpv|j641yj
San Marcos|san marcos||GT|1i3|jcw|37h8|-joc0|j63xin
San Marino|san marino||SM||mtn|9f0h|2o02|j64itf
San Martín|san martin||AR|138|2il3|-7364|-eoh0|j647pz
San Martín|san martin||CO|13b|ck1|sh4|-fslg|j64ebp
San Martín Base|san martin base||AQ||k|-ell7|-edqw|j64iw3
San Mateo|san mateo||US|bb|dfc6|81sh|-q7rv|j641fj
San Matias|san matias||BO|1in|4wg|-3i8g|-cirs|j64l3p
San Miguel|san miguel||SV|1i6|4biz|2w1d|-iwfd|j646cl
San Nicolas|san nicolas|san nicolas de los arroyos|AR|e4|2qke|-756c|-cwtc|j647sh
San Pablo|san pablo||PH|xk|55tq|30k8|q04q|j64ckt
San-Pedro|san pedro||CI|6z|4i8x|10t4|-1f8g|j64gk1
San Pedro|san pedro|san pedro de jujuy|AR|rg|1932|-56vo|-dwjg|j64hgf
San Pedro|san pedro|san pedro de ycuamandiyu|PY|1i7|780|-55vo|-c8fk|j644xt
San Pedro de las Colonias|san pedro de las colonias|san pedro|MX|e9|15fc|5irc|-m2mb|j64ctz
San Pedro de Macorís|san pedro de macoris||DO|1i8|4o4r|3yd4|-euq0|j64e8d
San Pedro Sula|san pedro sula||HN|f4|ekrf|3blk|-iv8s|j64j1n
San Quintín|san quintin||MX|61|46x|6j7p|-ouoc|j64ctf
San Rafael|san rafael||AR|138|2c8b|-7ez4|-en9h|j64l25
San Rafael|san rafael|san rafael de velasco|BO|1in|xd|-3lgz|-d07j|j64hx1
San Ramon|san ramon||PE|ri|bck|-2dvk|-g5bs|j64b2p
San Ramón|san ramon||BO|ia|50a|-2ujk|-dvb0|j64hch
San Ramón de la Nueva Orán|san ramon de la nueva oran||AR|1hk|1l57|-4yjs|-dsao|j64k35
San Salvador|san salvador||SV|1i9|uppk|2xsv|-j4b6|j64mit
San Salvador de Jujuy|san salvador de jujuy||AR|rg|6k0z|-56ll|-dzuw|j64k33
San Sebastián|san sebastian|donostia san sebastian|ES|1c8|7nto|9a9g|-fa0|j64a8z
San Vicente|san vicente||SV|1ia|ssu|2x96|-j12i|j63wy7
San Vicente del Caguán|san vicente del caguan||CO|br|15o|fz4|-fzxc|j64e8v
Sanaa|sanaa|sana a|YE|2m|171ds|3ahr|9h32|j64mu3
Sanandaj|sanandaj||IR|vp|7hfc|7kdk|a2t4|j6471b
Sancti Spíritus|sancti spiritus||CU|1ib|2q1p|4p7p|-h0zd|j64e67
Sand Point|sand point||US|26|ij|bv05|-yeek|j643kh
Sandakan|sandakan||MY|1gv|8eow|1932|pbbs|j64kkt
Sandnes|sandnes||NO|1ga|1073|cm1y|17wk|j64bbd
Sandspit|sandspit||CA|9r|ey|bet0|-s98d|j64h03
Sanford|sanford||US|jl|75as|6658|-hf5s|j642d7
Sangar|sangar||RU|1hd|3kp|dp8p|rblf|j64jcb
Sangli|sangli||IN|10w|cvwe|3m3g|fzfa|j64fkl
Sangolquí|sangolqui||EC|1d5|3tsm|-2e4|-gteg|j646b7
Şanlıurfa|sanliurfa|sanhurfa|TR|1ih|9mvh|7yt0|8bce|j64j2t
Sanming|sanming||CN|ju|4hlw|5me4|p794|j6469p
Sanniquellie|sanniquellie||LR|17n|8t3|1kvi|-1v0i|j63wkx
Santa Ana|santa ana|santa ana del yacuma|BO|ia|50xa|-2y68|-e20o|j647r3
Santa Ana|santa ana||SV|1ik|50xa|2zze|-j71q|j64e7h
Santa Barbara|santa barbara||US|bb|3w5c|7dpa|-pnrk|j64l9j
Santa Bárbara|santa barbara||HN|1il|bnz|3746|-iwu0|j63tid
Santa Barbara|santa barbara||MX|db|8c0|5qsk|-moig|j64cuf
Santa Bárbara|santa barbara||CL|5l|2p2|-82nw|-ffpk|j646xf
Santa Clara|santa clara||CU|1tc|5dao|4su8|-h50z|j64ji5
Santa Cruz|santa cruz|santa cruz de la sierra|BO|1in|192om|-3sz4|-djvb|j64mqn
Santa Cruz|santa cruz||US|bb|36jg|7x9z|-q5k8|j64l65
Santa Cruz|santa cruz||BR|1fz|lfj|-1bzs|-7q0c|j647gl
Santa Cruz|santa cruz||EC|k4|8ou|-445|-jd58|j64lqf
Santa Cruz Cabrália|santa cruz cabralia||BR|5z|f2x|-3hm8|-8d5o|j647en
Santa Cruz de Tenerife|santa cruz de tenerife||ES||77b1|63oc|-3hdw|j64l61
Santa Cruz Del Quiche|santa cruz del quiche||GT|1f5|i82|37zx|-jj6t|j63ymf
Santa Cruz do Sul|santa cruz do sul||BR|1g0|2fo9|-6d8s|-b8mo|j6479z
Santa Fe|santa fe||AR|1io|ahpd|-6s0f|-d0ac|j64m3h
Santa Fe|santa fe||US|175|1zih|7nd1|-mpf0|j64m8l
Santa Inês|santa ines||BR|11w|1g0w|-s8o|-9q8c|j6474f
Santa Lucía|santa lucia||UY|bi|com|-7dz0|-c36o|j6410v
Santa Maria|santa maria||BR|1g0|5car|-6d1d|-bj4g|j64k0j
Santa Maria|santa maria||US|bb|2df5|7hll|-ptam|j648id
Santa Maria da Vitória|santa maria da vitoria||BR|5z|i4g|-2vbg|-9h4k|j64ky5
Santa Marta|santa marta||CO|10q|995x|2es8|-fwjl|j64jhz
Santa Rita|santa rita||VE|1r2|ojm|299i|-fbq7|j648vt
Santa Rosa|santa rosa||US|bb|4yuo|88oo|-qarc|j648hb
Santa Rosa|santa rosa||AR|x5|2dz4|-7uk8|-ds54|j64m35
Santa Rosa|santa rosa||BR|1g0|19qp|-5z1j|-bo7s|j64gsx
Santa Rosa de Copán|santa rosa de copan|santa rosa|HN|ev|rex|35ys|-j114|j6448t
Santa Rosalía|santa rosalia||MX|62|96j|5us3|-o2du|j64ctt
Santa Vitória do Palmar|santa vitoria do palmar||BR|1g0|lfj|-76n4|-bft0|j64793
Santana do Livramento|santana do livramento||BR|1g0|1x7i|-6m9s|-bwh0|j6478p
Santander|santander||ES|bm|4h2z|9aq5|-tbk|j649d7
Santarém|santarem||BR|1bz|4xss|-irx|-bq2g|j64mn5
Santarém|santarem||PT|1ir|mo9|8epi|-1uzo|j63vg5
Santiago|santiago||CL|1fq|3elkw|-7635|-f5aa|j64n3z
Santiago|santiago|santiago de los caballeros|DO|1is|x8kh|46go|-f5ak|j64lql
Santiago|santiago|santiago de veraguas|PA|1sz|zgj|1qi4|-hcvd|j64bqn
Santiago|santiago||PE|pf|829|-31hk|-g8ew|j64b2l
Santiago de Compostela|santiago de compostela||ES|k7|1zbi|96vx|-1twj|j64a8l
Santiago de Cuba|santiago de cuba||CU|1iu|bwwp|4aii|-g91h|j64lqj
Santiago del Estero|santiago del estero||AR|1iv|7lok|-5ydl|-drvv|j64l2h
Santiago Ixcuintla|santiago ixcuintla||MX|16m|e65|4od4|-mjvs|j645vl
Santiago Tuxtla|santiago tuxtla||MX|1sy|c3l|3yio|-kfc8|j64d2j
Santissima Trindade|santissima trindade|mato grosso,vila bela da santissima trindade|BR|12q|cjz|-37qo|-cuks|j64kx7
Santo André|santo andre||BR|1nj|e739|-52i8|-9z0e|j647yn
Santo Ângelo|santo angelo||BR|1g0|1eh8|-62d4|-bmts|j647a7
Santo António|santo antonio||ST||w4|coy|1l6w|j6406p
Santo Domingo|santo domingo||DO|gv|1a61c|3yj4|-ezd8|j64my1
Santo Tomas|santo tomas||PE|fi|36u|-33ko|-fg68|j644tv
Santos|santos|baixada santista|BR|1nj|10mo8|-54ta|-9xit|j64l2n
Sanya|sanya||CN|n2|7rup|3wvz|ngxs|j64jj3
São Borja|sao borja||BR|1g0|19zx|-6550|-c06c|j64gs1
São Carlos|sao carlos||BR|1nj|4e7f|-4pwo|-a9is|j6480f
São Francisco do Sul|sao francisco do sul||BR|1im|ry8|-5mgs|-af00|j64gtj
São Gabriel|sao gabriel||BR|1g0|16ru|-6hy8|-bn4w|j6479h
São Gabriel da Cachoeira|sao gabriel da cachoeira|sao cabriel da cachoeira|BR|2q|br3|-110|-edm9|j64kvz
São João da Boa Vista|sao joao da boa vista||BR|1nj|1n24|-4plk|-a118|j6480b
São João del Rei|sao joao del rei||BR|13l|1on4|-4j1g|-9hfo|j64777
São José de Ribamar|sao jose de ribamar||BR|11w|16n5|-joc|-9g1o|j6474b
São José do Rio Preto|sao jose do rio preto||BR|1nj|814b|-4gho|-al3g|j64hj3
São José dos Campos|sao jose dos campos||BR|1nj|g5m1|-4z0g|-9u0f|j647zn
São José dos Pinhais|sao jose dos pinhais||BR|1bw|e95z|-5has|-ajh4|j647b3
São Lourenço do Sul|sao lourenco do sul||BR|1g0|jjw|-6q1w|-b52w|j64797
São Luís|sao luis|grande s|BR|11w|m8xc|-jec|-9hkn|j64m07
São Luiz Gonzaga|sao luiz gonzaga||BR|1g0|oja|-637o|-bs2o|j647a3
São Mateus|sao mateus||BR|iu|1ni5|-40io|-8jk8|j64gx5
São Paulo|sao paulo|sio paulo|BR|1nj|b7ww8|-51rj|-9zry|j64n45
São Tomé|sao tome||ST||1w2j|2km|1fyd|j64msb
Sapele|sapele||NG|g9|6mju|19g8|17ts|j64d9z
Sapouy|sapouy||BF|1wl|2yl|2h5k|-doo|j63zxf
Sapporo|sapporo||JP|of|1iiyo|98dt|uakl|j64mxz
Saraburi|saraburi||TH|1iw|1ilt|3448|lme8|j649vl
Sarajevo|sarajevo||BA|1ix|exln|9eck|3xue|j64mrt
Sarandë|sarande|saranda|AL|1tk|bor|8joy|4abk|j63yql
Saranpaul|saranpaul||RU|ue|2ax|drrd|d2g4|j64ceb
Saransk|saransk||RU|14i|6i3m|blzc|9om0|j64c57
Sarapul|sarapul||RU|1rm|2674|c3sn|bj43|j64cb1
Sarasota|sarasota||US|jl|cn7r|5uxd|-hot8|j64jvb
Saratoga Springs|saratoga springs||US|178|171t|98fi|-ftbu|j6433x
Saratov|saratov||RU|1iz|i2go|b20b|9v5l|j64ljb
Saravan|saravan|salavan|LA|1j0|49d|3d9k|mt72|j63y83
Sargodha|sargodha||PK|1ei|bmob|6vkm|fkri|j64be7
Sarh|sarh||TD|11f|3mjw|1ylo|3xwc|j64knf
Sari|sari||IR|12w|5tgr|7u0w|bdq0|j64g5t
Sariwon|sariwon||KP|p4|3bjy|894e|qydw|j63w6b
Sarmiento|sarmiento||AR|dv|401|-9ruo|-et1t|j64l23
Sarnen|sarnen||CH|19o|79e|a1vi|1rlq|j63wdf
Sarnia|sarnia||CA|1aa|338s|97j6|-hnsw|j647kh
Sarqan|sarqan|sarkand|KZ|2e|1ncn|9qgr|h4ml|j64g45
Saryshaghan|saryshaghan||KZ|1er|3d9|9vuz|fs1r|j64g2j
Sasebo|sasebo||JP|15q|537o|73vz|rswp|j64ey1
Saskatoon|saskatoon||CA|1j3|49im|b6jo|-mv2k|j64mnt
Saskylakh|saskylakh||RU|1hd|1hc|fewu|og9t|j64jcf
Sasovo|sasovo||RU|1gn|o65|bncz|8zdb|j64c5x
Sassandra|sassandra||CI|6z|tmz|1274|-1axt|j64gk7
Sassari|sassari||IT|1j2|2l5l|8q9w|1u4k|j64jg7
Satadougou|satadougou||ML|tq|jm|2pcq|-2g0i|j64d57
Satipo|satipo||PE|ri|bzg|-2evs|-g0b8|j644vp
Satu Mare|satu mare||RO|1j5|2esq|a8rk|4wky|j63uqf
Satun|satun||TH|1j6|qnk|1f1z|lg4b|j63uwx
Sauðárkrókur|saudarkrokur||IS|11|22i|e3aw|-47ja|j64a7x
Saurimo|saurimo||AO|zz|vvo|-22j8|4dbw|j64hrl
Savanna-la-Mar|savanna la mar|sav la mar sav savanna la mar|JM|1ut|n5c|3w5k|-gpg8|j63x1d
Savannah|savannah||US|kn|3v17|6v2r|-hduk|j64lb7
Saveh|saveh||IR|123|3rfx|7i8a|ascy|j64g75
Savissivik|savissivik|thule|GL||1u|gakj|-dyet|j64l5v
Savonlinna|savonlinna||FI|1m4|l3t|d9d6|66v5|j646zl
Sawahlunto|sawahlunto||ID|1mz|12uq|-553|llnd|j64dn1
Sayanogorsk|sayanogorsk||RU|w0|16xm|bdn2|jl90|j64cnj
Sayhut al Ghamirah|sayhut al ghamirah|sayhut|YE|1q|59|39d5|azeu|j64jyh
Saywun|saywun|seiyun|YE|n0|1h1n|3f0m|agg1|j649q7
Scarborough|scarborough||GB|18o|1igb|bmtw|-3bg|j64adn
Schaffhausen|schaffhausen||CH|1j9|q4n|a83o|1um2|j63ujx
Schefferville|schefferville||CA|1fa|d3|bqu8|-ebk7|j647mj
Schenectady|schenectady||US|178|375z|96cy|-fuiw|j64973
Schwerin|schwerin||DE|131|22kh|bhu5|2g3b|j640ph
Schwyz|schwyz||CH|1jb|axt|a2t4|1uq8|j63ukj
Scone|scone||AU|176|3kg|-6vj0|wbyt|j64ie1
Scott Base|scott base||AQ||2d|-goo5|zqn7|j64iut
Scottsbluff|scottsbluff||US|16q|jnn|8z1v|-m7un|j648qn
Scottsdale|scottsdale||US|48|bvt|77yz|-nz6g|j648fj
Scottsdale|scottsdale||AU|1oy|1wk|-8tif|vm8v|j64inf
Scranton|scranton||US|1cd|3cis|8vil|-g7tf|j64987
Sdid Bouzid|sdid bouzid|sidi bouzid|TN|1kc|whe|7i6v|21aw|j63t6z
Seattle|seattle||US|1u8|1tvww|a72f|-q7zv|j64mt3
Sebba|sebba||BF|1v5|2ix|2voc|43c|j64021
Sechura|sechura||PE|1da|hrg|-16wc|-hbm0|j64ayx
Seeb|seeb|as sib|OM|15a|53i0|52pu|cgxt|j64j8h
Sefra|sefra|ain sefra|DZ|16n|1cxo|70s4|-4h3|j64hyf
Segezha|segezha||RU|t2|pqi|dnxo|7cuj|j64bz1
Ségou|segou||ML|1nk|2mvc|2vpc|-1caw|j64lx3
Séguéla|seguela||CI|1ux|13h1|1pcg|-1fgs|j64gjn
Sekondi|sekondi|sekondi takoradi|GH|1un|64vc|1255|-d5c|j64kpp
Selawik|selawik||US|26|n4|e9x3|-yan2|j643qj
Selfoss|selfoss||IS|8e|4ub|dpba|-4i0h|j64a81
Sélibaby|selibaby|selibabi|MR|mf|cs|3912|-2m09|j64d4h
Selkirk|selkirk||CA|11m|7pe|aqyk|-krk1|j647gn
Selma|selma||US|23|fj2|6y24|-ingk|j648xj
Semarang|semarang||ID|qv|tx5s|-1hqn|nnzp|j64mid
Sembe|sembe||CG|1id|7gv|cno|34i0|j64ftl
Semey|semey|semipalatinsk|KZ|hw|6o8p|at5q|h7em|j64lyf
Semnan|semnan||IR|1jf|2obe|7mcc|bfu7|j64g5x
Sena Madureira|sena madureira||BR|9|k7k|-1xzg|-epv0|j64kvh
Senanga|senanga||ZM|1un|7px|-3gdo|4zjw|j64a4l
Sendai|sendai||JP|13v|1c840|87fv|u846|j64lub
Senhor do Bonfim|senhor do bonfim||BR|5z|11ef|-28mo|-8m3w|j64gwj
Senmonorom|senmonorom||KH|15j|64o|2o2c|mz5s|j63zef
Sennar|sennar||SD|1jg|2sei|2wjw|779c|j64kb3
Sensuntepeque|sensuntepeque||SV|b1|ktp|2z3k|-izvg|j646cd
Seoul|seoul||KR|1jh|5tyn4|81vn|r7x6|j64n1f
Sept-Îles|sept iles||CA|1fa|jti|as8p|-e81c|j64k2b
Serang|serang||ID|6q|3j4v|-1b58|mr20|j64dzx
Serdar|serdar|gyzlarbat|TM|68|11e2|8cqj|c28q|j6442z
Serdobsk|serdobsk||RU|1ce|sa4|b8su|9h7u|j64c5l
Serebryansk|serebryansk||KZ|hw|jh|anhj|hvpl|j6463l
Seremban|seremban||MY|16r|7zqt|kwx|luko|j64bh5
Seres|seres|serres|GR|u2|174e|8t0s|51pl|j64fvf
Sergiyev Posad|sergiyev posad||RU|14o|2cas|c2n8|86is|j645dn
Serov|serov||RU|1nc|23ye|crzq|czh6|j64j7f
Serowe|serowe||BW|cb|11h9|-4srg|5q3g|j64m53
Serpukhov|serpukhov||RU|14o|2wm8|brug|80t8|j64c23
Serrinha|serrinha||BR|5z|17ul|-2hw0|-8d04|j64gwb
Sete Lagoas|sete lagoas||BR|13l|4bcm|-462o|-9hfo|j64gpl
Sétif|setif||DZ|1gr|5vzs|7r60|15o0|j64l4n
Settat|settat||MA|cv|3gt0|72pk|-1mso|j64brh
Setúbal|setubal||PT|yx|2j12|89as|-1wo8|j64j3v
Sevastopol|sevastopol|sevastapol|RU|f8|84lc|9k4w|767u|j64map
Severnyy|severnyy|severny|RU|vh|8x6|eho3|dqs1|j645i1
Severo Kurilsk|severo kurilsk||RU|1he|1va|av4p|xgcy|j64cs3
Severobaykalsk|severobaykalsk||RU|af|jwo|bx9w|nfgq|j64jah
Severodvinsk|severodvinsk||RU|4a|45x0|du84|8jbw|j64j6d
Severomorsk|severomorsk||RU|157|15lt|esyz|75w7|j645al
Severouralsk|severouralsk||RU|1nc|rvu|cw65|cunz|j645j5
Seville|seville||ES|31|pz7x|80ma|-1a54|j64mbt
Seward|seward||US|26|28k|cvxq|-w1bg|j64j0j
Seymour|seymour||AU|1t8|2ul|-7xra|v3t5|j64iif
Sfax|sfax||TN|1jl|9pkq|7g4s|2aps|j64jxb
Sfintu-Gheorghe|sfintu gheorghe|sfantu gheorghe|RO|f6|1ath|9tx4|5j0q|j63ur7
Shache|shache|yarkant county|CN|1v2|i8xa|88hx|gk2c|j64lrn
Shadrinsk|shadrinsk||RU|wc|1pbr|c0qt|dmzx|j64c8b
Shah Alam|shah alam||MY|1jc|abna|nnv|lrkc|j63wr7
Shahhat|shahhat||LY|1i|yq0|71ax|4oou|j64ddv
Shahjahanpur|shahjahanpur||IN|1sa|6v8y|5z4k|h4ju|j64gbl
Shahrekord|shahrekord|shar e kord|IR|cm|2rnl|6xe2|awe4|j640qt
Shahrisabz|shahrisabz||UZ|te|aooh|8dei|ebob|j649rv
Shahrud|shahrud||IR|1jf|2trl|7t1h|bs3h|j64703
Shakhty|shakhty||RU|1gg|4qrk|a87o|8mq4|j64c2p
Shalaurova|shalaurova|shalaurova island|RU|1hd|a|foz0|uot5|j64cpl
Shalqar|shalqar|shalkar|KZ|3r|l14|a93v|crzh|j64ktp
Shamattawa|shamattawa||CA|11m|o6|byy0|-jqip|j64gyf
Shamva|shamva||ZW|12f|7yl|-3pn0|6rlg|j64a4v
Shangdu|shangdu||CN|16t|ej3|8wli|oc17|j646nd
Shanghai|shanghai||CN|1jt|8x81k|6ovs|q0zu|j64n3p
Shangqiu|shangqiu||CN|nx|11kmg|7du4|osch|j64jlb
Shangrao|shangrao||CN|r4|oj5t|63og|pa9g|j64ewl
Shangzhi|shangzhi||CN|nw|22tw|9ox8|rff8|j64f1v
Shannon|shannon||IE|e6|6rx|bany|-1we9|j6466p
Shantou|shantou||CN|m6|ybc8|50c8|p07t|j64mi1
Shanxian|shanxian|shan county|CN|1js|1lgb|7gg0|ovog|j64ev5
Shaoguan|shaoguan||CN|m6|ffre|5bcw|oce0|j64lpj
Shaowu|shaowu||CN|ju|2evd|5ung|p6mw|j64dwb
Shaoxing|shaoxing||CN|1wg|gnjc|6fhz|pub5|j64jmv
Shaoyang|shaoyang||CN|p0|z75|5sc0|nu0x|j64jk5
Shar|shar|charsk|KZ|hw|70f|ampv|hdf9|j64g3x
Sharbaqty|sharbaqty|sharbakty|KZ|1c5|2z|b93b|gr0b|j6463b
Sharjah|sharjah||AE|1jw|nn3n|5frm|bvip|j6442n
Sharya|sharya||RU|vt|rf0|cigm|9r5i|j64bz7
Shashemene|shashemene|shashamane|ET|g|2g8e|1jk4|89rg|j64fyh
Shawinigan|shawinigan||CA|1fa|11xl|9z6o|-fl7p|j64h5x
Shawnee|shawnee||US|1a3|mv0|7kpg|-kry2|j648rf
Shchekino|shchekino|shchyokino|RU|1r5|1ufc|bkrz|81gn|j645ff
Shebekino|shebekino||RU|7o|yve|at00|7wog|j645ft
Sheberghan|sheberghan||AF|qx|1zy1|7uus|e38n|j64845
Sheboygan|sheboygan||US|1uw|15ft|9dl0|-ist4|j642y7
Sheffield|sheffield||GB|1lw|rplw|bfs3|-bko|j644m5
Sheikhu Pura|sheikhu pura|sheikhupura|PK|1ei|7qs7|6sr4|fuws|j6454t
Shelburne|shelburne||CA|193|2fz|9dp4|-e00a|j64h6p
Shemonaikha|shemonaikha||KZ|hw|kyw|auoc|hjze|j6463f
Shendi|shendi||SD|1g4|3zzn|3kph|75vc|j64a9v
Shenyeng|shenyeng|shenyang|CN|yg|2ulo8|8yl1|qgj4|j64mxd
Shenzhen|shenzhen||CN|m6|4ihjc|4u13|ogk2|j64msv
Shepparton|shepparton||AU|1t8|pvy|-7so2|v5ui|j64iij
Sherbrooke|sherbrooke||CA|1fa|2zr8|9qb4|-fes8|j647lx
Sherlovaya Gora|sherlovaya gora||RU|dl|bf|atwa|oxdq|j645mn
Sherman|sherman||US|1ph|v30|77jc|-kpfq|j648u3
Shibin el Kom|shibin el kom|shibin al kawm|EG|1s|3x4k|6k1s|6mfc|j63x8n
Shieli|shieli||KZ|1fb|n0o|9gsm|eb1o|j64g11
Shihezi|shihezi||CN|1v2|dpts|9htk|ift7|j64jix
Shijiazhuang|shijiazhuang|shijianzhuang|CN|nu|1fsyw|85m0|ojbg|j64lsj
Shilka|shilka||RU|dl|awk|b48i|ovaq|j645mj
Shillong|shillong||IN|132|81rb|5hax|joy8|j64flh
Shimanovsk|shimanovsk||RU|2t|gka|b594|rdbj|j64jat
Shimonoseki|shimonoseki||JP|1v8|59ne|7a2u|s2dq|j646m1
Shinyanga|shinyanga||TZ|1k1|2aua|-s8k|75vc|j64aox
Shira|shira||RU|uc|77y|bogi|ja2z|j64chd
Shiraz|shiraz||IR|j9|qksg|6cn3|b9m9|j64mm5
Shishmaref|shishmaref||US|26|72|e78q|-zlf3|j649hp
Shishou|shishou||CN|ox|4yuj|6d64|o3a8|j64eqv
Shivamogga|shivamogga||IN|t6|e0o7|2zhk|g70w|j64fk3
Shiyan|shiyan||CN|ox|gi4w|6zb8|nqs8|j646jf
Shizuishan|shizuishan||CN|17q|2xdm|8eq5|mvu2|j64lrx
Shizuoka|shizuoka||JP|1k4|f1bt|7hya|tnse|j64f4j
Shkodër|shkoder||AL|1k5|3c6v|90lp|46lx|j64hnn
Sholapur|sholapur|solapur|IN|10w|mnl4|3sd0|g9mt|j64l7p
Shonzhy|shonzhy|chundzha|KZ|2e|30e|9bz1|h173|j64g4f
Shostka|shostka||UA|1n3|22pl|b49a|76bx|j649ov
Showa Station|showa station||AQ||1o|-esn4|8iol|j64iwn
Shoyna|shoyna||RU|16v|8c|ejnu|9gja|j64j6t
Shreveport|shreveport||US|zl|5bed|6yrs|-k3j8|j64lad
Shu|shu||KZ|1wf|wqv|9cdt|ft0o|j64gaf
Shuangcheng|shuangcheng||CN|nw|2suu|9pxb|r2ds|j64f31
Shuangyashan|shuangyashan||CN|nw|apsw|a040|s5i4|j64f1p
Shulan|shulan||CN|r8|1orw|9inv|r7jj|j64ezj
Shumen|shumen||BG|1k6|1vcj|99vg|5rse|j64877
Shumerlya|shumerlya||RU|e0|r6m|bw4g|9y7o|j64cbp
Shuozhou|shuozhou||CN|1ju|c7tc|8f8s|o3fs|j64epx
Shuya|shuya||RU|qh|1au9|c6ov|8v63|j645bp
Shuyang|shuyang||CN|r3|11xqo|7bcj|pggm|j64ewz
Shwebo|shwebo||MM|1h0|1wlu|4u7r|kidd|j64irx
Shymkent|shymkent||KZ|1lr|9z3k|92jk|ewzy|j64lz3
Si Racha|si racha||TH|ds|3u1w|2tja|lmrr|j649wl
Sialkote|sialkote|sialkot|PK|1ei|a8d0|6yxc|fzb4|j6454l
Šiauliai|siauliai||LT|1xc|2v14|bzmi|4zz6|j64533
Sibay|sibay||RU|72|1biu|bapf|ckgj|j64c6n
Šibenik|sibenik||HR|1xd|smw|9deg|3eqa|j63x6z
Sibiti|sibiti||CG|106|hln|-sgw|2v0c|j64ggx
Sibiu|sibiu||RO|1k8|3c19|9tdf|568r|j644qz
Sibolga|sibolga||ID|1n1|4nog|di4|l6cg|j64kix
Sibu|sibu||MY|1j1|4da0|hrq|nyzi|j64kkx
Sibut|sibut||CF|wt|qfv|188q|438x|j64h97
Sica Sica|sica sica||BO|x6|ry|-3ppw|-eilw|j6484j
Sicuani|sicuani||PE|fi|pwn|-329c|-f9m4|j64azl
Sidi bel Abbes|sidi bel abbes||DZ|1kb|4gyk|7jj3|-4xs|j64hxx
Sidney|sidney||US|16q|50c|8tfq|-m2l3|j648qj
Siem Reap|siem reap|siemreab|KH|1kd|2ceu|2v4y|m9b8|j64m45
Siena|siena||IT|1qi|14lt|9a8i|2fks|j64dqz
Sierra Colorado|sierra colorado|sierra colorada|AR|1fc|16a|-8p51|-ej5c|j64hft
Sierra Mojada|sierra mojada||MX|e9|a|5ujw|-m4yw|j64cu1
Siglan|siglan||RU|10n|a|cni9|wo1y|j64crp
Signy Research Station|signy research station||AQ||8|-czu1|-9ruv|j64iwd
Siguiri|siguiri||GN|sp|12pb|2g3f|-1yqa|j64gif
Siirt|siirt||TR|1ke|2fzm|84s0|8zk2|j63tun
Sikar|sikar||IN|1fe|8kn4|5x1k|g3s8|j64g9n
Sikasso|sikasso||ML|1kf|4u6x|2fck|-17ts|j64d5p
Sikonge|sikonge||TZ|1nt|kx5|-17fr|70us|j64ap5
Silchar|silchar||IN|4n|39l5|5ba8|jvz0|j64fl7
Siliana|siliana||TN|1ki|ksw|7qf5|20eh|j63t7f
Siliguri|siliguri||IN|1ud|b1ti|5q6c|iyiu|j64gcx
Silvassa|silvassa||IN|fo|l3z|4cdm|fnee|j646sf
Simao|simao||CN|1vt|3hk5|4vrz|ln5i|j64esf
Simferopol|simferopol||RU|f8|7obg|9mtw|7b3v|j649mz
Simla|simla|shimla|IN|oa|3pvj|6nyw|gjf6|j646rd
Sin-Ni|sin ni||KP|1bf|f0n|8gow|qw34|j63w6x
Sincelejo|sincelejo||CO|1mk|5lj7|1zoo|-g5mw|j64eap
Sing Buri|sing buri||TH|1kl|fgu|36va|lip6|j63v1f
Singapore|singapore||SG||333ro|9zq|m9cb|j64n4b
Singaraja|singaraja||ID|66|50x0|-1qm8|oo2o|j64e0n
Singida|singida||TZ|1km|1c68|-116s|7g20|j64ast
Singkawang|singkawang||ID|s7|5bd8|71c|ncs7|j64e05
Singleton|singleton||AU|176|anp|-6zb3|wecw|j64ich
Sinop|sinop||TR|1ko|qvm|9092|7j8q|j63tq1
Sinop|sinop||BR|12q|6wx|-2jfo|-bvxk|j64kxd
Sion|sion||CH|1sg|ln1|9ws6|1kqs|j63uhl
Sioux City|sioux city||US|q1|1y5w|93xo|-knts|j648oj
Sioux Falls|sioux falls||US|1ln|3c5o|9c18|-kqdg|j64lab
Sioux Lookout|sioux lookout||CA|1aa|3iy|arty|-jp8e|j64h3j
Siping|siping||CN|r8|bwpl|993o|qnc4|j64jn3
Siracusa|siracusa|syracuse|IT|1ka|2nex|7y1c|39z8|j64dsh
Sirjan|sirjan|saidabad|IR|u6|3r14|6be4|by0k|j6471v
Sironko|sironko||UG|a1|avo|9n8|7cns|j63u37
Sirsa|sirsa||IN|ni|3w5j|6bjs|g2xo|j64fgf
Şirvan|sirvan|ali bayramli,shirvan|AZ|0|1ijg|8k4b|ahgz|j64ho5
Sisaket|sisaket|si sa ket|TH|1k7|yj3|38o3|md0i|j649w7
Sisimiut|sisimiut||GL|1et|417|ecl8|-bi3e|j64lwp
Sisophon|sisophon||KH|ao|12ta|2wta|m2mh|j64hqb
Sitapur|sitapur||IN|1sa|3ivn|5x70|hb2k|j64727
Siteki|siteki||SZ|zt|4qw|-5o4m|6ujk|j63v9f
Sitia|sitia||GR|w1|6td|7jlw|5ldm|j64fv5
Sitka|sitka||US|26|6w3|c8a4|-t06z|j64lc7
Sittwe|sittwe||MM|1fg|3u54|4beg|jwo0|j64m6x
Sivas|sivas||TR|1kt|5npy|8ioe|7xri|j64ag5
Siwa|siwa|siwa oasis|EG|12s|ht4|69b4|5gvz|j64knj
Skagway|skagway||US|26|qj|cqs7|-t037|j64jxz
Skellefteå|skelleftea||SE|1tw|o5r|dvs9|4hng|j649md
Skien|skien||NO|1pa|1kky|cosg|222o|j64j4d
Skikda|skikda||DZ|1kv|4tr1|7wkk|1h8o|j64hyj
Skopje|skopje||MK|ca|al8n|902o|4ldr|j64lx5
Skovorodino|skovorodino||RU|2t|7pz|bkjd|qk5b|j64jav
Slantsy|slantsy||RU|ya|rxt|co3w|60mj|j645az
Slatina|slatina||RO|1a5|1oy4|9iv2|581q|j63uaz
Slavgorod|slavgorod||RU|2h|qcd|bczl|gv0o|j64cgl
Slavonski Brod|slavonski brod||HR|9s|23ee|9ogj|3v0c|j646hv
Slidell|slidell||US|zl|1szz|6hlq|-j8r7|j641w3
Sligo|sligo||IE|1kx|flw|bmq7|-1tgh|j64dp3
Sliven|sliven||BG|1ky|22cw|95be|5n5w|j6486p
Slobodskoy|slobodskoy||RU|v4|11s2|cl2p|ar94|j64c95
Slobozia|slobozia||RO|pb|14np|9jwk|5va4|j63ued
Slyudyanka|slyudyanka||RU|q6|eih|b2ka|m858|j64j97
Smara|smara||MA|md|115h|5q9x|-2i5d|j64kip
Smithers|smithers||CA|9r|4th|bqky|-r982|j64kzb
Smithton|smithton||AU|1oy|38q|-8r2h|v3q7|j64inb
Smolensk|smolensk||RU|1kz|6vof|bqpf|6va1|j64li5
Sobral|sobral||BR|c8|3dws|-sh0|-8ncc|j647dp
Sobral Base|sobral base|sobral scientific base|AQ||14|-hedr|-8oif|j64ivz
Sóc Trăng|soc trang||VN|1nm|6fhc|223p|mpqw|j64a1v
Sochi|sochi||RU|vz|70s8|9ccc|8ik4|j64lij
Socorro|socorro||CO|1iq|j7j|1duj|-fpcs|j64e5p
Socorro|socorro||US|175|6os|7atp|-mwu6|j648kt
Sodankylä|sodankyla||FI|xw|6we|eg6z|5p8w|j64fzf
Sodo|sodo||ET|1m3|1eq1|1h8o|83a4|j64kt1
Sofia|sofia||BG|lm|peco|95d1|4zwb|j64mqz
Sogamoso|sogamoso||CO|9e|2pnb|184w|-fmt4|j646bh
Sohag|sohag||EG|1ms|cuyo|5ov4|6slk|j64ei3
Sohano|sohano||PG|18m|1sy|-15w9|x5g7|j64bpd
Sokcho|sokcho||KR|kb|1tx2|86tj|rk7s|j64cjl
Söke|soke||TR|5c|1nod|83ag|5vhz|j64adx
Sokodé|sokode||TG|ce|2iwj|1xdd|8vg|j649dp
Sokol|sokol||RU|1tm|wji|cqu0|8liw|j64c0h
Sokolo|sokolo||ML|1nk|3di|35op|-1bbp|j64d6d
Sokoto|sokoto||NG|1l2|foya|2srs|14fk|j64mgl
Sol-lletsk|sol lletsk|sol iletsk|RU|1ak|l5n|ayr7|bsdr|j64cbz
Soldado Bartra|soldado bartra||PE|za|a|-jex|-g8ma|j64b1v
Soledad|soledad||CO|4y|ez8k|2c9c|-g0xg|j646dz
Solenzo|solenzo||BF|6r|80h|2m09|-vi9|j63zsd
Solikamsk|solikamsk||RU|1ci|25sc|csf0|c5vw|j6462d
Solnechnogorsk|solnechnogorsk||RU|14o|19fv|c1hr|7xch|j64c1v
Sololá|solola||GT|1l3|z0d|35zm|-jjkm|j63xk5
Solothurn|solothurn||CH|1l4|bgl|a4ag|1m5m|j63wd1
Solwezi|solwezi||ZM|18r|1e5k|-2lz8|5npc|j64a3p
Somoto|somoto||NI|10j|foc|2vzc|-ik2u|j63vb3
Sơn La|son la||VN|1l7|epa|4kkg|m9rw|j63tbd
Sơn Tây|son tay||VN|p8|4297|4j3q|mm2y|j649yl
Songea|songea||TZ|1gk|2pkh|-2aeo|7n2s|j64kif
Songkhla|songkhla||TH|1l9|11ig|1jms|ljxc|j64k8l
Songnam|songnam|seongnam|KR|mm|k6uo|80w6|r8zi|j64isf
Songo|songo||AO|1rj|85v|-1kpk|36l0|j64hs5
Songyuan|songyuan|fuyu|CN|r8|amn0|9om4|qr48|j64ey5
Sonipat|sonipat||IN|ni|5dax|67rk|giag|j646rl
Sonsón|sonson||CO|3c|eip|183y|-g55a|j646bd
Sonsonate|sonsonate||SV|1lb|3mcz|2xv4|-j8d0|j646ch
Sopore|sopore|suyyapur|IN|qr|1cmz|7cns|fyl7|j646sb
Sorata|sorata||BO|x6|1ou|-3du4|-eps9|j6484t
Sorø|soro||DK|1ku|5j3|bvq2|2h8z|j63yc1
Sorocaba|sorocaba||BR|1nj|c2mp|-5190|-a6a4|j64m3n
Sorong|sorong||ID|q4|2ov3|-6lm|s502|j64jox
Soroti|soroti||UG|1ld|su|d74|779c|j64al3
Sosnogorsk|sosnogorsk||RU|vh|mn3|dmp8|bjun|j64c8x
Sotik|sotik|chamagel|KE|1fx|1j05|-58s|7izk|j64b9l
Sotouboua|sotouboua||TG|ce|g8u|1u0y|7lm|j63t3z
Soubré|soubre||CI|6z|2c1x|18og|-1f04|j64gjx
Souk Ahras|souk ahras||DZ|1le|2w4j|7s0o|1pcc|j64i15
Sousse|sousse||TN|1li|70bg|7ogs|29ze|j64lc3
South Bend|south bend||US|pv|551q|8xmp|-ihic|j642px
Southampton|southampton||GB|1ly|88m9|awqw|-asw|j644bz
Southaven|southaven||US|13t|2lkk|7htl|-jagz|j642jn
Southend-on-Sea|southend on sea|southend|GB|1lz|d95e|b1rg|5k0|j644l3
Southern Cross|southern cross||AU|1uo|57|-6ov5|pknj|j64i95
Sovetsk|sovetsk||RU|sb|xf1|bsxq|4ouc|j64bx3
Sovetsk|sovetsk||RU|v4|dsd|cca1|ahrh|j64c91
Sovetskaya Gavan|sovetskaya gavan|savetskaya gavan|RU|ub|my4|ahur|u2d9|j64jdb
Soyo|soyo||AO|1w0|1g2r|-1bao|2ng4|j64hsf
Spanish Town|spanish town||JM|1h4|99vk|3urd|-ghr0|j646d3
Spartanburg|spartanburg||US|1ll|2nry|7ho6|-hk6z|j642kt
Sparti|sparti||GR|1cb|chn|7y29|4t2h|j64fu3
Spassk Dalniy|spassk dalniy|spassk dalny|RU|1e5|zf0|9k4y|sgue|j64cph
Spencer|spencer||US|q1|8n7|98wt|-ke5s|j641od
Split|split||HR|1m6|4lp1|9bt0|3j30|j64eff
Spokane|spokane||US|1u8|7gah|a7to|-p60n|j64l9b
Spring Hill|spring hill||US|jl|2gi1|63qt|-hoxx|j642fb
Springbok|springbok||ZA|18u|81y|-6cwr|3tzl|j64lgj
Springfield|springfield||US|12j|91g4|9100|-fk14|j6429p
Springfield|springfield||US|13u|4irf|7yvs|-k028|j64juj
Springfield|springfield||US|pl|2vy3|8j94|-j7qs|j64izj
Springfield|springfield||US|19y|1t9c|8k0w|-hyls|j642ud
Springfield|springfield||US|1ai|178g|9fwn|-qcwk|j641jn
Springs|springs||ZA|kg|525v|-5mp4|63d8|j64bmb
Srednekolymsk|srednekolymsk||RU|1hd|2o3|egg4|wy18|j64jbn
Sri Jayawardenepura Kotte|sri jayawardenepura kotte|sri jawewardenepura kotte|LK|eg|2hde|1h8o|h4wc|j64ljt
Srinagar|srinagar||IN|qr|ofmo|7b4r|g19f|j64lv5
St. Anthony|st anthony||CA|179|68|b0h9|-bx0f|j64h7h
St-Augustin|st augustin|saint augustin|CA|1fa|321|azdz|-ckiu|j647n3
St. Augustine|st augustine||US|jl|1mwb|6eo5|-hfff|j648yf
St.-Benoit|st benoit|saint benoit|RE|x9|r8u|-4ian|bxvs|j64glv
St.-Brieuc|st brieuc|saint brieuc|FR|9o|152f|aecv|-lh5|j646sx
St. Charles|st charles||US|13u|7q5h|8b9f|-jecm|j648pj
St. Charles|st charles||US|129|1heg|89v3|-ghnx|j6432b
St. Cloud|st cloud||US|13m|2f16|9rjw|-k6k6|j648c3
St.-Denis|st denis|saint denis|RE|x9|42n3|-4h3p|bvu9|j64m03
St. George|st george||US|1s7|243y|7yaq|-ocex|j64iy1
St.-Jerome|st jerome|saint jerome|CA|1fa|1oiv|9t4z|-fuzk|j647mz
St. John's|st john s|saint john s|CA|179|2tfx|a762|-bahm|j64mov
St. Joseph|st joseph||US|13u|1o70|8iuy|-kbu8|j648q1
St. Louis|st louis||US|13u|1b4rc|8a4i|-jcb7|j64mtb
St.  Paul|st paul|saint paul|US|13m|fr0m|9msg|-jy8y|j64l8t
St.  Petersburg|st petersburg|saint petersburg,sankt peterburg|RU|e3|2pl48|cuia|6hwl|j64muz
St. Petersburg|st petersburg||US|jl|h5ix|5ya1|-hpyi|j64izf
Stamford|stamford||US|er|g0bs|8srp|-frfk|j6428p
Standerton|standerton||ZA|150|1l45|-5rv7|69m8|j64bn1
Stanley|stanley||FK||1ph|-b2x4|-cedg|j64mrz
Stans|stans||CH|17h|5rn|a29o|1sop|j63uh1
Stara Zagora|stara zagora||BG|1ma|32o7|93c7|5hpf|j64i1n
Staraya Russa|staraya russa||RU|194|qgv|cfho|6pxk|j64bxp
Starorybnoye|starorybnoye||RU|1p3|a|flgy|mgn4|j64ja3
Starsy Oskol|starsy oskol|stary oskol|RU|7o|4v4x|azu4|83z4|j64c41
State College|state college||US|1cd|1vue|8qrl|-goru|j6498d
Stavanger|stavanger||NO|1ga|3pl8|cn0k|17ts|j64j4b
Stavropol|stavropol||RU|1mb|7s54|9nlw|8zx4|j64lhv
Stawell|stawell||AU|1t8|5e7|-7xyc|uljk|j64ih1
Steinbach|steinbach||CA|11m|7i9|am2r|-kq0h|j64gy5
Steinkjer|steinkjer||NO|186|8p6|dpyj|2gqg|j64bbp
Stepanakert|stepanakert||AZ|1v4|18ch|8j7w|a0qo|j64hov
Stephenville|stephenville||CA|179|5fy|aem8|-cjwi|j64h77
Sterlitamak|sterlitamak||RU|72|5q73|bht8|bzsg|j64j6l
Stettler|stettler||CA|29|48m|b7sy|-o5gx|j647i7
Stillwater|stillwater||US|1a3|10s3|7qtm|-kszf|j641vf
Stockholm|stockholm||SE|1me|r3b4|cpyv|3vmi|j64n0z
Stockton|stockton||US|bb|eosa|84vx|-pzvl|j648g1
Stoeng Treng|stoeng treng|stung treng|KH|1m8|mw1|2wce|mpp8|j63zdn
Stoke|stoke|stoke on trent|GB|1mg|8djl|bcyc|-gtk|j64ajf
Stony Rapids|stony rapids||CA|1j3|48|cpay|-mom5|j647hp
Stralsund|stralsund||DE|131|1bco|bmzg|2t2w|j64fz3
Strasbourg|strasbourg||FR|2f|9fhg|aeug|1nss|j64jq5
Streaky Bay|streaky bay||AU|1lj|tg|-716f|srlx|j64ifj
Strelka|strelka||RU|10n|a|d9da|wmrq|j64crz
Strezhevoy|strezhevoy||RU|1qg|yk0|d0mc|gmld|j64bvj
Stuttgart|stuttgart||DE|5r|1r458|age0|1yzk|j64jid
Subotica|subotica||RS|1jk|255s|9vh8|47uo|j6473t
Suceava|suceava||RO|1mi|29ms|a7kp|5mm9|j644rd
Suchboatar|suchboatar|sukhbaatar|MN|1jd|ip7|arqc|mrg0|j63w7h
Sucre|sucre||BO|dz|4thi|-42x6|-dzjn|j64mpj
Sudbury|sudbury|greater sudbury|CA|1aa|3dsx|9yso|-hcqq|j64l0p
Suez|suez||EG|4h|aw8f|6fiq|6z5n|j64lr1
Suhar|suhar|sohar|OM|16|38s5|57z8|c5rk|j64j8f
Suihua|suihua||CN|nw|5emt|9zsw|r7s8|j64f1l
Suileng|suileng|suiling town|CN|nw|18l9|a4jw|r8r8|j646ot
Suining|suining|suining sichuan|CN|1k9|ujjc|6jm1|mmaa|j64kod
Sukabumi|sukabumi||ID|qu|5xa6|-1hbc|mwug|j64dyz
Sukhothai|sukhothai|sukhothai thani|TH|1mt|7xg|3n9j|ldor|j649u5
Sukhumi|sukhumi|sokhumi|GE|4|1qx6|97y0|8sig|j64kst
Sukkur|sukkur||PK|1kk|8ycn|5xu8|er8m|j64j53
Sullana|sullana||PE|1da|3g2d|-11q8|-haj4|j64az7
Sumbawanga|sumbawanga||TZ|1gh|1wsp|-1pf0|6rzc|j64ao1
Sumbe|sumbe|ngunza|AO|fd|pod|-2ehw|2yv8|j64l3b
Sumenep|sumenep||ID|qw|1tbk|-1i1t|oegw|j64e0t
Sumqayt|sumqayt|sumqayit|AZ|1n2|5zef|8p48|amy4|j6483x
Sumter|sumter||US|1ll|1390|79qf|-h7x5|j6490v
Sumy|sumy||UA|1n3|6b7c|awxn|7gdd|j64jyd
Sunbury|sunbury||AU|1t8|n39|-81w0|v0l8|j64iix
Sunchales|sunchales||AR|1io|9rj|-6moh|-d71u|j64hih
Sunchon|sunchon||KP|1bf|8l4l|8g70|qzr2|j6465x
Sunderland|sunderland||GB|1re|9phi|brrk|-anc|j644bp
Sundsvall|sundsvall||SE|1tx|1kml|ddhd|3pm7|j64leh
Sungai Petani|sungai petani||MY|tx|7omb|17ld|ljax|j64bgj
Sungaipenuh|sungaipenuh|sungai penuh|ID|qq|2209|-fx3|lqdo|j64fbt
Sunshine Coast|sunshine coast|sunshine coast region|AU|1f2|1itf|-5pv4|wsxw|j64883
Suntar|suntar||RU|1hd|6nz|dbic|p7nj|j64jcn
Sunyani|sunyani||GH|9u|1i8r|1kls|-i0w|j63xy7
Superior|superior||US|1uw|la4|a0i4|-jqof|j64955
Supham Buri|supham buri|suphan buri|TH|1n4|157b|33nq|lglm|j63uzf
Sur|sur||OM|4j|1iwg|4u72|crdg|j64kft
Surabaya|surabaya|surabaja|ID|qw|1oz7s|-1jx5|o5z5|j64mwb
Surakarta|surakarta||ID|qv|bwh8|-1mde|nr4q|j64lpz
Surat|surat||IN|fo|2aci8|4jlf|fm0t|j64myz
Surat Thani|surat thani||TH|1n5|3dmj|1ylp|laih|j64lel
Surgut|surgut||RU|ue|8kn4|d4on|fqju|j64met
Surigao|surigao|surigao city|PH|gp|1vrs|23hv|qwa0|j64cln
Surin|surin||TH|1n6|1c94|36v8|m6jn|j649xp
Surt|surt|sirte|LY|1n8|2quz|6otg|3k0c|j64ksj
Susques|susques||AR|rg|ud|-50on|-e8zl|j647w1
Susuman|susuman||RU|10n|5on|dgft|vr9g|j64jdj
Suva|suva||FJ|cb|3rc7|-3vwy|128v5|j64mkl
Suwon|suwon|suweon|KR|mm|n3sg|7zhx|r809|j64j2l
Suzhou|suzhou|suzhou anhui|CN|36|163fk|77jx|p2ll|j64lpf
Suzhou|suzhou|suzhou jiangsu|CN|r3|zd5c|6pj4|pup1|j64l7d
Svay Rieng|svay rieng||KH|1na|ihg|2dhs|mod6|j63zfl
Svea Station|svea station|svea|AQ||a|-fzhh|-2ejr|j64ivl
Svendborg|svendborg||DK|1nf|mik|bsxc|29x3|j64ghl
Svobodnyy|svobodnyy|svobodny|RU|2t|1d38|b0ni|rgo0|j64jal
Svolvær|svolvaer||NO|188|38l|emhp|34eb|j64j2z
Swakopmund|swakopmund||NA|im|mr7|-4uwx|345i|j64ki1
Swan Hill|swan hill||AU|1t8|75o|-7kok|urk8|j64iit
Swansea|swansea||GB|1nd|6b43|b2do|-uh8|j644e3
Swellendam|swellendam||ZA|1up|aju|-7ahw|4dn0|j64biv
Swift Current|swift current||CA|1j3|bi2|arzp|-n3j6|j64gyt
Sydney|sydney||AU|176|2r8j4|-79pp|wejc|j64n47
Sydney|sydney||CA|193|syq|9vg5|-cwco|j64m2j
Syktyvkar|syktyvkar||RU|vh|4y66|d7rs|aw4o|j64j7b
Sylhet|sylhet||BD|1ng|52vc|5c5o|jowg|j6487v
Syracuse|syracuse||US|178|e78x|986c|-gbks|j64lbp
Syzran|syzran||RU|1hq|423e|be9g|ae2o|j645jx
Szczecin|szczecin||PL|1uk|8qo3|bg70|3444|j64df3
Szeged|szeged||HU|fa|40vp|9wvc|4bh8|j64anf
Székesfehérvár|szekesfehervar||HU|jd|33cv|a45n|3y1d|j644oj
Szekszárd|szekszard||HU|1qe|qda|9xlc|40e2|j63u65
Szolnok|szolnok||HU|rm|2cb1|a43c|4bpe|j64ann
Szombathely|szombathely||HU|1sq|2ci6|a4e5|3kb3|j644nx
Tabora|tabora||TZ|1nt|351b|-12qg|7134|j64kib
Tabriz|tabriz||IR|hs|uaa0|85w2|9x8x|j64lyv
Tabuk|tabuk||SA|1nu|bqt1|630e|7u26|j64lfp
Tacheng|tacheng||CN|1v2|12f8|a0q4|hs1o|j64jiv
Tacloban|tacloban||PH|yd|601y|2et4|qsi8|j64clb
Tacna|tacna||PE|1nv|604i|-3uw0|-f21w|j64mc5
Tacoma|tacoma||US|1u8|ffgc|a4a9|-q9by|j64ixd
Tacuarembó|tacuarembo|rivera|UY|1nw|15vp|-6soc|-bzy0|j640z5
Tadjoura|tadjoura||DJ|1nx|h4h|2ix5|970o|j63xb7
Tadmur|tadmur||SY|oh|16iv|7elc|87e9|j649g1
Taedong|taedong||KP|1be|1gc|8pej|qvz9|j64dj3
Taganrog|taganrog||RU|1gg|5zbk|a4fg|8cb4|j645e7
Tagum|tagum||PH|g2|56u|1kyl|qyox|j64clj
Tahoua|tahoua||NE|1o2|2hh0|36yw|14l3|j64leb
Taian|taian|tai an,taian shandong|CN|1js|ywy0|7rc3|p3ot|j64jm5
Taibao|taibao||TW|d9|r08|50xw|pshx|j640vb
Taichung|taichung|t aichung|TW|1o3|1kcsr|56cx|pv6p|j64m7x
Tailai|tailai||CN|nw|1mmw|9xy8|qg8k|j64f27
Tainan|tainan|t ainan|TW|1o4|147rs|4xgw|prgw|j64l6d
Taipei|taipei||TW|1o5|43wa9|5d6e|q20z|j64n2n
Taiping|taiping||MY|1cf|52xz|11je|ll5s|j64kk7
Taitung|taitung|taitung city|TW|1o6|3r14|4vky|pyq0|j64l6f
Taiyuan|taiyuan|taiyuan shanxi|CN|1ju|1qfoo|849e|o4dz|j64mx1
Taizhou|taizhou||CN|r3|d4hw|6yp4|pp5k|j64ewv
Taizz|taizz|ta izz|YE|1nr|g3h4|2wzk|9fsn|j64lc5
Tajarhi|tajarhi|tegerhi tajirhi|LY|158|15o|581k|33no|j64dcp
Tak|tak||TH|1o8|pkq|3ma7|l8vx|j649un
Takamatsu|takamatsu||JP|s1|75vz|7d07|sqao|j646mz
Takaoka|takaoka||JP|1qm|3n8d|7uy4|td3k|j646p5
Takéo|takeo|takev|KH|1o8|bs0|2cr2|mgih|j64hr1
Taksimo|taksimo||RU|af|7zr|c2nn|omhw|j64cof
Talara|talara||PE|1da|24g2|-zc8|-hf5s|j64k8x
Talas|talas||KG|1oa|r50|942o|fhfh|j64bfd
Talca|talca||CL|12t|48dj|-7lkm|-fd0c|j64krh
Talcahuano|talcahuano||CL|aw|66a2|-7vb3|-fo67|j646x1
Taldyqorghan|taldyqorghan|taldykorgan|KZ|2e|1w70|9n80|gsxs|j64jsf
Talkeetna|talkeetna||US|26|ty|dcw6|-w692|j643r3
Tall Afar|tall afar|tal afar|IQ|17p|33gx|7sog|93jm|j64fwf
Tallahassee|tallahassee||US|jl|4qp2|6iyc|-i2b4|j64lb1
Tallinn|tallinn||EE|nh|8g14|cqlf|5asw|j64mjh
Taloqan|taloqan||AF|1o9|1dkw|7ves|ewko|j63z91
Taloyoak|taloyoak||CA|19e|li|ewit|-k1ph|j64m23
Taltal|taltal||CL|3d|7qa|-5fzk|-f3r0|j64kqz
Tamale|tamale||GH|18s|7q83|20j8|-6hc|j64fe1
Tamanrasset|tamanrasset||DZ|1ob|1mn4|4vt6|16m4|j64mqv
Tamazunchale|tamazunchale||MX|1i2|1k31|4k4g|-l66v|j64cxd
Tambacounda|tambacounda||SN|1od|1wu4|2ybw|-2xk0|j64b6v
Tambov|tambov||RU|1oe|6gmi|bav8|8voc|j64j6j
Tame|tame||CO|41|mgb|1duj|-fdjs|j64eb3
Tampa|tampa|tampa st petersburg|US|jl|1dlhs|5znl|-ho9q|j64mtl
Tampere|tampere||FI|1d9|5k27|d6jc|5398|j64lxz
Tampico|tampico|ciudad madero tamaulipas|MX|1oc|if4r|4s2g|-kz64|j64mg5
Tamuín|tamuin||MX|1i2|bdo|4plo|-l5yk|j64cx7
Tamworth|tamworth||AU|176|tqv|-6nzm|wchf|j64k5b
Tan An|tan an||VN|z7|2y3e|29a1|mt47|j64a1d
Tan Tan|tan tan||MA|md|1e1w|63dc|-2dnc|j64dlj
Tanacross|tanacross||US|26|3s|dl35|-uq2g|j649l1
Tanana|tanana||US|26|8k|dyvb|-wlg4|j643ut
Tandil|tandil||AR|e4|28hx|-7zyo|-coek|j64k2v
Tanga|tanga||TZ|1oh|4tik|-134c|8dmc|j64kih
Tangail|tangail||BD|ge|3v00|5744|j9ts|j6484f
Tangier|tangier||MA|1oi|g2r0|7ntt|-1907|j64kdb
Tangshan|tangshan|tangshan hebei|CN|nu|149ug|8hrb|pbz8|j64jl1
Tanjung Pandan|tanjung pandan|tanjungpandan|ID|6j|1c4m|-l7w|n2ms|j64lq3
Tanjungpinang|tanjungpinang|tanjung pinang|ID|u4|4uwa|72o|me3u|j64epd
Tanta|tanta||EG|1c|8of9|6lkw|6n74|j64efn
Taonan|taonan||CN|r8|2hz7|9prs|qbdk|j64eyj
Taoudenni|taoudenni||ML|1pw|2bv|4uwa|-uqi|j64kqj
Taoyuan|taoyuan||TW|1ok|apsw|5ctd|q01j|j640vp
Tapachula|tapachula||MX|d8|4qxd|36yw|-jryk|j64jel
Tara|tara||RU|1a8|ktm|c712|fxwm|j64j7z
Tarabuco|tarabuco||BO|dz|1vg|-43zs|-dwxb|j647qv
Ṭarābulus|tarabulus|tripoli|LB|18k|bcy8|7dlo|7orc|j64ksv
Tarakan|tarakan||ID|sa|44z1|pgo|p7nu|j64mi3
Taranto|taranto||IT|3m|4bw1|8okc|3oy4|j64ds3
Tarapoto|tarapoto||PE|1i4|q0|-1e8c|-ge4g|j64j3f
Tarawa|tarawa|south tarawa|KI||m82|abq|1130g|j64l5j
Taraz|taraz|dzhambul|KZ|1wf|7ocp|970o|fanm|j64lz5
Tarbes|tarbes||FR|13g|16bq|99l9|n5|j646tt
Taree|taree||AU|176|y3a|-6u4g|woei|j64icx
Târgoviște|targoviste||RO|hr|1w8j|9mqs|5gfy|j63ubt
Târgu Jiu|targu jiu||RO|lc|22zf|9nki|4zl0|j63uah
Tarija|tarija||BO|1os|3ew5|-4m0v|-dvm4|j64m4h
Tarin Kowt|tarin kowt|tarinkot|AF|1s2|7ps|6zst|e48b|j63z75
Tarlac|tarlac|tarlac city|PH|1ot|3xx6|3bh2|pufe|j64ckj
Tarma|tarma||PE|ri|13me|-2g1g|-g8c4|j644vx
Tarragona|tarragona||ES|c3|2pg3|8tac|9n8|j649ed
Tarsus|tarsus||TR|13a|j626|7wvo|7h4w|j64aff
Tartagal|tartagal||AR|1hk|1axf|-4tzw|-dod0|j647wf
Tartu|tartu||EE|1ou|2604|cihr|5q3f|j64ko5
Tartus|tartus||SY|1ov|3hr8|7h66|7owi|j649fn
Tarutung|tarutung||ID|1n1|109|fkb|l7mr|j64dmj
Tash Komur|tash komur|tashkomur|KG|qn|i7e|8uzv|fhca|j64bf7
Tashkent|tashkent||UZ|1ox|1at6o|8us0|euo2|j64n0t
Tashtagol|tashtagol||RU|u0|hkr|bbce|itzp|j64cgp
Tasiilaq|tasiilaq||GL||1et|e26r|-82dt|j64l5l
Tasikmalaya|tasikmalaya||ID|qu|5t7r|-1kiu|n6zn|j64klz
Tasiusaq|tasiusaq||GL||6y|fq4a|-c0k6|j64iwh
Tatabánya|tatabanya||HU|vm|1ifh|a6wc|3y8a|j63u5n
Tataouine|tataouine||TN|1oz|1ca9|72mo|28rf|j63t57
Tatarsk|tatarsk||RU|195|jem|bu3f|ga5t|j64ci3
Tatuí|tatui||BR|1nj|207g|-5064|-a9ag|j64811
Tatvan|tatvan||TR|8h|1khy|894a|928w|j644i1
Tauá|taua||BR|c8|mis|-1aaj|-8n18|j64gut
Taubaté|taubate||BR|1nj|8ne0|-4xmb|-9rjk|j64hjf
Taunggyi|taunggyi||MM|1jr|3fjn|4gcs|ksr0|j6403p
Taungoo|taungoo||MM|5y|2aip|427f|knyr|j64ipn
Taupo|taupo||NZ|55|hfs|-8ak2|11qmb|j64n5j
Tauranga|tauranga||NZ|7f|2lr0|-82v8|11r7k|j64n5l
Tavda|tavda||RU|1nc|ugo|cfy1|dzjb|j64ca1
Tawau|tawau||MY|1gv|6kgu|wye|p9ow|j64kkp
Taxco|taxco||MX|me|1529|3zag|-lco8|j64d15
Tây Ninh|tay ninh||VN|1rh|2pia|2fda|mr1a|j63t9j
Tayshet|tayshet||RU|q6|149k|bzjh|l02t|j64j93
Tayynsha|tayynsha|tajynsha|KZ|18h|a58|bjht|eyau|j64g31
Taza|taza||MA|1p4|4a1d|7c1o|-v0o|j64br5
Tazovsky|tazovsky|tazovskiy|RU|1v9|4m5|egkr|gv94|j64j71
Tbilisi|tbilisi|t bilisi|GE|1p5|nkrk|8xyu|9llc|j64mlt
Tchibanga|tchibanga||GA|19h|exx|-m1m|2d32|j63xzt
Te Anau|te anau||NZ|1m5|1fl|-9qd6|zyfl|j64n71
Tébessa|tebessa|tbessa|DZ|1nq|3oim|7l88|1qnk|j64i1b
Tebingtinggi|tebingtinggi|tebing tinggi|ID|1n1|5qtn|pp4|l8w4|j64dmn
Tecoman|tecoman||MX|ef|1ygp|41zo|-m9jk|j64cxv
Tecpan|tecpan|tecpan de galeana|MX|me|bam|3p3o|-lkuo|j645xz
Tecuala|tecuala||MX|16m|bih|4suc|-mlqg|j64czb
Teeli|teeli|teli|RU|1ra|2vo|axrx|jc8t|j64jab
Tefé|tefe||BR|2q|13ot|-pxc|-dv88|j64kvv
Tegal|tegal||ID|qv|52xo|-1h08|ndz4|j64dzj
Tegucigalpa|tegucigalpa||HN|jo|k9xs|30ts|-iozn|j64mbb
Tehran|tehran||IR|1p6|4oqug|7n9f|b0s0|j64n27
Tehuacan|tehuacan||MX|1ee|56ad|3yd4|-kve0|j64d0f
Tehuantepec|tehuantepec|santo domingo tehuantepec|MX|19l|x08|3i04|-kess|j64jed
Tejen|tejen||TM|s|1fxa|80ey|cysg|j6443p
Tekax|tekax||MX|1vq|hli|4bv4|-j4w0|j645zz
Tekirdağ|tekirdag||TR|1p7|2mcv|8sad|5w9o|j64aef
Tel Aviv|tel aviv|tel aviv jaffa,tel aviv yafo|IL|1p8|1up8g|6vjn|7g9t|j64myh
Telêmaco Borba|telemaco borba||BR|1bw|19fk|-57qb|-aul4|j647bx
Télimélé|telimele||GN|uy|ndz|2c56|-2sn2|j63ygz
Teller|teller||US|26|2b|dzks|-znnc|j643ph
Telsen|telsen||AR|dv|dw|-935o|-ecl8|j64hav
Teluk Intan|teluk intan||MY|1cf|26fv|uyf|lnka|j64bgb
Telukbutun|telukbutun||ID|u4|3w|wje|n6vk|j64eph
Tema|tema||GH|lx|4h9k|17is|2s|j64fff
Temirtau|temirtau||KZ|1er|3nmw|aqay|fn02|j64js1
Temple|temple||US|1ph|1b6x|6nzh|-kv9a|j648vh
Temuco|temuco||CL|x1|5p65|-8auc|-fk14|j64jqf
Tena|tena||EC|1r8|o0m|-7k4|-godw|j64e4j
Tengchong|tengchong|tengyue|CN|1vt|2p9m|5d5p|l3ru|j646k5
Tenkodogo|tenkodogo||BF|9a|tek|2iwc|-2up|j64iof
Tennant Creek|tennant creek||AU|18x|301|-47mc|srhs|j64k3x
Tenosique|tenosique||MX|1ns|p0f|3qvo|-jlh8|j64d0t
Teófilo Otoni|teofilo otoni||BR|13l|262a|-3tvw|-8w7s|j64kx1
Tepelenë|tepelene||AL|l2|983|8mtt|4akt|j63yuj
Tepic|tepic||MX|16m|6tz1|4lxq|-mh9c|j64cz1
Terbyas|terbyas||RU|1hd|a|dsq9|pu59|j64jc5
Teresina|teresina||BR|1d3|jfug|-13ar|-963w|j64m11
Ternate|ternate||ID|117|40ox|64a|raqm|j64lnz
Ternopil|ternopil||UA|1pe|58v4|am80|5he5|j649nv
Terrace|terrace||CA|9r|f03|boiw|-rk5l|j647iz
Terre Haute|terre haute||US|pv|1kic|8giy|-iqhn|j642on
Tessalit|tessalit||ML|ur|4mo|4bvi|8eg|j64kqn
Tessenei|tessenei|teseney|ER|kf|brr|38lc|7uun|j64ejt
Tete|tete||MZ|1pf|2rs4|-3gro|773s|j64lgt
Tetovo|tetovo||MK|1pg|2jx8|9058|4ht1|j6460x
Texarkana|texarkana||US|49|1lf2|761h|-k5lj|j648nj
Texas City|texas city||US|1ph|1hy2|6axp|-kcqk|j6424f
Teyateyaneng|teyateyaneng||LS|7z|3y3|-68y2|5y56|j63ws3
Teziutlán|teziutlan||MX|1ee|3t6s|48xo|-kv8g|j64d0j
Tezpur|tezpur||IN|4n|19er|5pia|jw1s|j64fl3
Thái Bình|thai binh||VN|1pj|4i1c|4dsn|msgy|j63tdd
Thái Nguyên|thai nguyen||VN|1pp|apsw|4mo0|mol8|j64j17
Thakhek|thakhek|muang khammouan|LA|ud|1ncw|3qcg|mgx5|j64dht
Thames|thames||NZ|1u1|57o|-7yk8|11mtp|j64n6n
Thanh Hóa|thanh hoa||VN|1pk|48fj|48xk|mocw|j64j1b
Thanjavur|thanjavur||IN|1of|4pf7|2b3s|gyq4|j64gf3
Thargomindah|thargomindah||AU|1f2|5n|-601s|utp3|j64k6j
The Hague|the hague||NL|1wq|u4vk|b5uo|wy4|j64lg1
The Pas|the pas||CA|11m|4o7|bj92|-lp4d|j64kyt
Theodore|theodore||AU|1f2|6u|-5cif|w61t|j64ij5
Thermopolis|thermopolis||US|1uz|2np|9crw|-n6zn|j648nd
Thessalon|thessalon||CA|1aa|14o|9wv8|-hwoc|j647k3
Thessaloniki|thessaloniki||GR|u2|hqw0|8q11|4wkf|j64mln
Thiès|thies||SN|1pn|6a2x|36a0|-3mms|j64b6l
Thika|thika||KE|cb|24my|-80s|7y6s|j64bkb
Thimphu|thimphu||BT|1pm|2450|5vze|j7nq|j64mr3
Thiruvananthapuram|thiruvananthapuram||IN|u5|kg40|1tln|ghqh|j64lvb
Thohoyandou|thohoyandou||ZA|ys|5s3v|-4x30|6j6o|j64kct
Thompson|thompson||CA|11m|alb|by63|-kz56|j64m1f
Thongwa|thongwa|thongwa township|MM|1vb|14i8|3la3|koqx|j64ipt
Three Springs|three springs||AU|1uo|5a|-6bvp|ot4s|j64k4n
Thu Dau Mot|thu dau mot||VN|at|58hh|2cmz|muxr|j63te3
Thunder Bay|thunder bay||CA|1aa|24na|adta|-j4um|j64mon
Thung Song|thung song||TH|15z|lrz|1qx0|ldie|j649t1
Tianjin|tianjin||CN|1pr|49w4g|8dy0|p4b1|j64mxh
Tianshui|tianshui||CN|kc|q97s|7ezo|mp9o|j64lov
Tiarat|tiarat|tiaret|DZ|1ps|3y4j|7kzw|a6o|j64i0j
Tibati|tibati||CM|d|rgl|1dwe|2ph9|j64hn1
Ticul|ticul||MX|1vq|njr|4des|-j6tg|j64d3n
Tidjikdja|tidjikdja|tidjikja|MR|1o1|ff1|3z4s|-2g3a|j64khf
Tidore|tidore||ID|117|1arn|5dg|rbaw|j64dmt
Tieli|tieli||CN|nw|2clg|a29s|rg1g|j64f2x
Tieling|tieling||CN|yg|7acg|92e4|qjeg|j64euj
Tierra Amarilla|tierra amarilla||CL|4v|9y0|-5w1c|-f2a8|j646uz
Tijuana|tijuana||MX|61|xaaw|6ysc|-p3er|j64mfz
Tikhoretsk|tikhoretsk||RU|vz|1doj|9tsz|8lpd|j64c4z
Tikhvin|tikhvin||RU|ya|1bwb|cs80|76lk|j64bxz
Tikrit|tikrit||IQ|1hg|17nz|7eya|9d0i|j64fwl
Tiksi|tiksi||RU|1hd|4ec|fcod|rm3i|j64mfv
Tillabéri|tillaberi||NE|17d|ev2|31ns|b7n|j64awn
Tillamook|tillamook||US|1ai|6a9|9qqg|-qjkp|j641k5
Timaru|timaru||NZ|bn|kzk|-9ikk|10pbd|j64n5n
Timashevsk|timashevsk|timashyovsk|RU|vz|xyw|9s1j|8chw|j64c4v
Timbaúba|timbauba||BR|1cj|18e6|-1lv8|-7kj4|j64hkp
Timbedra|timbedra||MR|od|6t|3he0|-1r0i|j64d5z
Timbuktu|timbuktu||ML|1pw|1h54|3lde|-n9y|j64mkp
Timika|timika||ID|1br|k2t|-z3s|tc90|j64do5
Timimoun|timimoun||DZ|j|11zp|69l9|230|j64hxt
Timiryazevskiy|timiryazevskiy|timiryazevskoe|RU|1qg|5ji|c3we|i74c|j64bvb
Timișoara|timisoara||RO|1px|6r3h|9t2s|4jre|j64axn
Timmiarmiut|timmiarmiut||GL|vj|a|deid|-91qv|j64jqn
Timmins|timmins||CA|1aa|qzi|adyy|-hfkl|j64m2b
Timon|timon|teresina|BR|11v|4cr9|-13gu|-96le|j6474n
Tindouf|tindouf||DZ|1py|e3i|5xja|-1qva|j64l41
Tingo María|tingo maria||PE|p2|1515|-1zog|-gacc|j64b0p
Tinogasta|tinogasta||AR|c4|gb|-60ka|-ehci|j647vn
Tirana|tirana||AL|ho|j6uu|8uvv|48x9|j64mq5
Tiraspol|tiraspol||MD|7q|3d54|a1ir|6cpc|j64bsd
Tirgu Mures|tirgu mures|targu mures|RO|156|37ax|9z8u|59hm|j64ay1
Tiruchirappalli|tiruchirappalli|trichinopoly,trichy|IN|1of|kdso|2bfb|gv5s|j64lzt
Tirunelveli|tirunelveli||IN|1of|bmd4|1vd4|gngk|j64gev
Tirupati|tirupati|tirupathi|IN|33|65h7|2xbs|h0t4|j64fhz
Tiruppur|tiruppur|tirupur|IN|1of|dxjk|2dhw|gkok|j64gfh
Tiruvannamalai|tiruvannamalai|tiruvannaamalai|IN|1of|2yo3|2mlo|gyc8|j64ge7
Titusville|titusville||US|jl|14d3|64rv|-hbim|j648yb
Tizi-Ouzou|tizi ouzou||DZ|1q1|3340|7v9p|v7x|j63zhb
Tizimín|tizimin||MX|1vq|weh|4j1k|-iw64|j64d3b
Tiznit|tiznit||MA|1lh|18ix|6d8w|-235k|j64brv
Tlaxcala|tlaxcala||MX|1q2|assm|452o|-l1y4|j645wz
Tlaxiaco|tlaxiaco||MX|19l|gi7|3p9c|-kxpc|j64d05
Tlimcen|tlimcen|tlemcen|DZ|1q3|4xap|7h7s|-a6o|j64hy1
Tmassa|tmassa|tmassah|LY|158|dw|5ng2|3dww|j64lxb
Toamasina|toamasina||MG|1q4|4i7m|-3wai|al7m|j64klj
Tobol|tobol||KZ|1ew|5ir|bamc|detx|j64g0t
Tobolsk|tobolsk||RU|1rf|2ft4|ch2m|emqg|j64j81
Tocache|tocache||PE|1i5|med|-1r44|-gefk|j64b13
Tocantinópolis|tocantinopolis||BR|1q5|6r2|-1crg|-a5w8|j64gp3
Toconao|toconao||CL|3d|ai|-4yvp|-ekti|j64fr7
Tocopilla|tocopilla||CL|3d|ivg|-4qg4|-f1l8|j64kqt
Tofino|tofino||CA|9r|19z|aiui|-qz5p|j64895
Togiak|togiak||US|26|6k|cnsg|-ydhj|j64jxl
Toguchin|toguchin||RU|195|gvy|bu7t|i329|j645lx
Tokar|tokar||SD|1fp|1khe|3y8d|835h|j64k83
Tokat|tokat||TR|1q7|2s2u|8n04|7u4e|j63tqj
Tokmak|tokmak|tokmok|KG|8c|2f30|96h7|g4we|j6455p
Tokoroa|tokoroa||NZ|1u1|aau|-86xx|11p0x|j64n75
Toktogul|toktogul||KG|qn|k5f|8z62|fmsc|j64bf3
Tokushima|tokushima||JP|1q9|9ieo|7av6|su7p|j646n3
Tokyo|tokyo||JP|1qa|l8ns0|7nd2|tybb|j64n3t
Tôlanaro|tolanaro||MG|1qc|cz6|-5d3w|a2ks|j64kln
Toledo|toledo||US|19y|a2lg|8xj0|-hwwo|j64jwb
Toledo|toledo||ES|c2|1ll4|8jm6|-uzr|j649cz
Toliara|toliara||MG|1qc|2gzb|-5080|9d44|j64lpx
Toltén|tolten|nueva tolten|CL|x0|1rp|-8eli|-fowr|j646w5
Tolú|tolu||CO|1mk|l4u|21ku|-g748|j64eav
Toluca|toluca|toluca de lerdo|MX|15i|wtbs|4563|-ld2n|j64d1t
Tolyatti|tolyatti||RU|1hq|f2cf|bgno|am6c|j64cct
Tom Price|tom price||AU|1uo|23n|-4v3r|p8wb|j64i7n
Tomah|tomah||US|1uw|a11|9fe3|-jebz|j642zn
Tomakomai|tomakomai||JP|of|3qvq|953c|uc7g|j64f4x
Tombstone|tombstone||US|48|17m|6sp7|-nla5|j648fb
Tômbua|tombua|tombwa|AO|163|uv4|-3dww|2jig|j64l3n
Tomsk|tomsk||RU|1qg|bh6f|c3x2|i7o6|j64me5
Tonantins|tonantins||BR|2q|3ip|-m5z|-ej5v|j64kvt
Tongchuan|tongchuan||CN|1jm|61si|7iog|nda4|j64jjd
Tonghua|tonghua||CN|r8|l0b|8xls|qyak|j646mf
Tongliao|tongliao||CN|16t|iy3k|9cl7|q7fc|j64ltf
Tongling|tongling||CN|36|c2a8|6mtc|p8so|j64dxh
Tongren|tongren||CN|mg|2j9u|5xl0|ne1w|j64dvx
Tongue|tongue|tougue|GN|xd|jp7|2g9s|-2i1o|j63ydd
Tonk|tonk||IN|1fe|3w86|5ls1|g8ss|j64g9j
Tonopah|tonopah||US|16z|2il|85q6|-p4jm|j641hn
Tønsberg|tonsberg||NO|1t3|u0y|cpa8|28eq|j63vqh
Toowoomba|toowoomba||AU|1f2|1zls|-5wot|wkhv|j64k6f
Topeka|topeka||US|sr|2tx7|8db8|-ki70|j64la3
Topki|topki||RU|u0|j1c|bujm|icks|j64ch3
Torbat-e Jam|torbat e jam||IR|1fn|28oy|7js9|czox|j64g8n
Toronto|toronto||CA|1aa|33qdk|9d7f|-h0to|j64n2d
Tororo|tororo||UG|1qh|37qo|5hc|7bno|j64amf
Torreón|torreon||MX|e9|oips|5hbc|-m60b|j64llt
Tórshavn|torshavn|thorshavn|FO|j2|b3y|damk|-1gmg|j64ji7
Torzhok|torzhok||RU|1rd|11gi|c81f|7hwb|j64c0d
Totness|totness||SR|f0|1at|19g8|-c2kg|j649ad
Totonicapán|totonicapan||GT|1qj|1ht2|372s|-jkx8|j63xkp
Tottori|tottori||JP|1qk|3awi|7lx8|srr1|j64exv
Touba|touba||CI|5v|l80|1rw0|-1nag|j63yjt
Tougan|tougan||BF|1lg|dkm|2sua|-nos|j63zun
Touggourt|touggourt||DZ|1b2|2vcy|73eg|1arc|j64l4f
Toulon|toulon||FR|1eb|7nzx|98tq|19o4|j64fo1
Toulouse|toulouse||FR|13g|i5js|9cl7|b68|j64jpz
Toumodi|toumodi|toumodi sakassou|CI|xf|u3h|1ek0|-12q6|j63ylf
Tournavista|tournavista||PE|ot|e7|-1wx6|-g0fg|j644ud
Tours|tours||FR|ce|5268|a5l8|5ef|j64fp5
Tovuz|tovuz||AZ|1ql|9qq|8saq|9s2p|j63z2l
Townsville|townsville||AU|1f2|2z7u|-44j7|vghg|j64mrj
Toyama|toyama||JP|1qm|74ss|7v6g|tevg|j646p1
Tozeur|tozeur||TN|1qn|uhc|79t4|1qqc|j649eh
Tra Vinh|tra vinh||VN|1qo|2tcw|24ng|msh8|j63tft
Trabzon|trabzon||TR|1qp|ge22|8s7c|8ihc|j64j2h
Tralee|tralee||IE|u8|kcw|b7aj|-22z3|j64671
Trancas|trancas||AR|1r3|18f|-5maf|-dzq9|j647wt
Trang|trang||TH|1qq|3624|1mcy|lckw|j649t5
Tranqueras|tranqueras||UY|1g5|5rm|-6oqo|-by64|j640yn
Traralgon|traralgon||AU|1t8|e2a|-86r0|vems|j64iht
Trat|trat||TH|1qu|gnq|2mf6|lyyq|j63v5l
Traverse City|traverse city||US|13e|xbp|9lfo|-icny|j649bp
Treinta y Tres|treinta y tres||UY|1qv|ld0|-74ek|-bnlk|j6410f
Trelew|trelew||AR|dv|203m|-99pw|-e038|j647pp
Trento|trento||IT|1qy|2b6o|9vk4|2dsw|j64du5
Trenton|trenton||US|174|7usx|8mbe|-g0q2|j64izz
Trepassey|trepassey||CA|179|b2|a0mi|-bfr5|j64iu1
Tres Arroyos|tres arroyos||AR|e4|10dc|-882c|-cx1n|j647tn
Três Lagoas|tres lagoas||BR|12r|1oqg|-4gf0|-b32o|j6475n
Treviso|treviso||IT|1sw|3st9|9se4|2mg0|j64697
Trieste|trieste||IT|jr|4moz|9s8o|2yhc|j64dtv
Trincomalee|trincomalee||LK|1qz|2bno|1u4a|hesq|j63w3d
Trindade|trindade||BR|l8|238x|-3kh0|-aly0|j647rv
Trinidad|trinidad||BO|ia|1t0j|-36ge|-dwrs|j64m33
Trinidad|trinidad||UY|jk|g9x|-76ts|-c71u|j63t1j
Trinidad|trinidad||US|ei|72c|7ytd|-medk|j648jb
Tripoli|tripoli||LY|1o7|1ax1k|71st|2tp4|j64myf
Tripoli|tripoli||GR|1cb|mcq|81f7|4soi|j64ftz
Trnava|trnava||SK|1r0|1huh|ad76|3rsw|j6452j
Trofimovsk|trofimovsk|trofimovskaya|RU|1hd|a|fk6l|r875|j64cqz
Trois-Rivières|trois rivieres||CA|1fa|2kct|9xn0|-fjsr|j64k27
Troitsk|troitsk||RU|d0|1rj6|blhd|d72u|j64c7f
Troll Station|troll station|troll|AQ||18|-ffoj|jjp|j64ivj
Trollhättan|trollhattan||SE|1tz|ydb|chlb|2mwo|j64aub
Tromsø|tromso||NO|1r1|14gk|exb3|42jk|j64mcv
Trondheim|trondheim||NO|1no|35j7|dlbr|28dj|j64mcx
Trout River|trout river||CA|179|ck|alth|-cgfi|j64h7v
Troyes|troyes||FR|cq|1blz|aczw|via|j64fpz
Truc Giang|truc giang|ben tre|VN|5k|19v6|26z2|mssm|j63tfh
Trujillo|trujillo||PE|x4|geer|-1qnk|-gxq0|j64mc7
Trujillo|trujillo||VE|1r2|12up|20do|-f3io|j648vl
Trujillo|trujillo||HN|ej|7fy|3erk|-if9s|j64a6n
Truth or Consequences|truth or consequences||US|175|5ht|73ns|-mzkh|j641ij
Tsau|tsau|tsao|BW|18q|135|-4bjw|4taw|j64i55
Tsavo|tsavo||KE|ea|bi|-n0k|88t6|j64bk1
Tsetserleg|tsetserleg||MN|46|fac|a6c1|lqsm|j6466b
Tshabong|tshabong|tsabong|BW|u9|7gv|-5kov|4su8|j64i51
Tshela|tshela||CD|6y|tz1|-12cg|2rro|j64f8z
Tshikapa|tshikapa||CD|ta|5qdi|-1dgk|4g9g|j64kot
Tsiigehtchic|tsiigehtchic||CA|18z|4v|egbh|-so0s|j647jv
Tskhinvali|tskhinvali||GE|1jy|tpi|91v9|9fba|j646zb
Tsu|tsu||JP|13j|apsw|7fvn|t9db|j64f4b
Tsumeb|tsumeb||NA|1at|bjj|-44gg|3sng|j64ki7
Tsuruoka|tsuruoka||JP|1v7|250s|8am4|tyxq|j64f6b
Tuapse|tuapse||RU|vz|24i1|9ge4|8df8|j64c4f
Tuban|tuban||ID|qw|1mtu|-1h8j|o0l0|j64e11
Tubarão|tubarao||BR|1im|1z77|-63r4|-ai8o|j647ct
Tubruq|tubruq|tobruk|LY|19|5nc7|6vj4|54vk|j64ksn
Tucano|tucano||BR|5z|o2r|-2cn4|-8bb0|j64gwf
Tucson|tucson||US|48|hn14|6wid|-nrnb|j64l9h
Tucumán|tucuman|san miguel de tucuman,san miguel de tucumnn|AR|1r4|hsfk|-5qwd|-dz8a|j64m3d
Tucumcari|tucumcari||US|175|43l|7jde|-m8cn|j648l5
Tucupita|tucupita||VE|143|13ri|1xwt|-dauw|j6499z
Tucuruí|tucurui||BR|1bz|1mwh|-se8|-ann4|j64kwl
Tuguegarao|tuguegarao||PH|b5|2gtd|3rwj|q391|j64j8t
Tukchi|tukchi||RU|ub|a|cana|twe0|j64cr3
Tuktoyaktuk|tuktoyaktuk||CA|18z|pt|evx0|-sim4|j64l0b
Tukuyu|tukuyu||TZ|12x|2qfm|-1zdc|77kg|j64anx
Tula|tula||RU|1r5|ahou|bm7k|82cr|j64j6h
Tula|tula|ciudad tula|MX|1oc|6zi|4xh0|-ldg0|j64cxh
Tulare|tulare||US|bb|1750|7rdi|-pkv5|j648ih
Tulcea|tulcea||RO|es|1zcr|9ord|6673|j644q5
Tulsa|tulsa||US|1a3|kaoi|7qpc|-kk78|j64la7
Tuluá|tulua||CO|1sj|3jp9|vk8|-gc1g|j64e9p
Tulun|tulun||RU|q6|13lu|bp11|ljyu|j64j9f
Tumaco|tumaco|tumaco narino|CO|16f|1uwp|dys|-gw3o|j64kmx
Tumakuru|tumakuru|tumkur|IN|t6|8kc6|2uus|giwo|j64kq3
Tumbes|tumbes||PE|1r6|2c9z|-rjo|-h8u0|j64k8z
Tumby Bay|tumby bay||AU|1lj|1dr|-7dat|t60x|j64ift
Tumen|tumen||CN|r8|24y1|97k4|rtp5|j64jn1
Tumut|tumut||AU|176|51a|-7kg8|vro8|j64iav
Tunceli|tunceli||TR|1r7|mfa|8dtr|8h1h|j63tv3
Tunduru|tunduru||TZ|1gk|go|-2dkg|80ck|j64asb
Tunguskhaya|tunguskhaya||RU|1hd|a|dwrw|qufo|j64cqj
Tunis|tunis||TN|1r9|1fphw|7vz0|26jp|j64ma1
Tunja|tunja||CO|9e|3gjo|16ts|-fq4k|j64e51
Tununak|tununak||US|26|9s|czhb|-zf4e|j643nx
Tunuyán|tunuyan||AR|138|hma|-76zy|-esjb|j64hb3
Tupã|tupa||BR|1nj|1bv7|-4p7o|-attb|j6480h
Tupelo|tupelo||US|13t|rqs|7cc3|-j0ft|j64907
Tupiza|tupiza||BO|1dv|m72|-4lfg|-e33k|j64hw1
Túquerres|tuquerres||CO|16f|q7v|8es|-gmx3|j646dh
Tura|tura||RU|iz|478|ds0h|lhj8|j64j8x
Turangi|turangi||NZ|1u1|2i0|-8cu9|11ola|j64n7p
Turbat|turbat||PK|6c|361b|5kjy|diny|j64j4t
Turbo|turbo||CO|3c|12z0|1qi4|-gg4o|j64e4x
Turgay|turgay|torgaj|KZ|1ew|42l|amx0|dlym|j640q3
Turin|turin|torino|IT|1d6|zeow|9ns3|1n60|j64jgb
Turkistan|turkistan||KZ|1lr|234g|9a48|emnp|j64jsp
Türkmenabat|turkmenabat|chardzhev|TM|cw|516p|8drw|dml4|j64lcv
Türkmenbaşy|turkmenbasy|turkmenbashi|TM|68|1gp0|8kti|bcpt|j64lcn
Turku|turku||FI|jh|3rrd|cygr|4rpy|j64jrj
Turnovo|turnovo|veliko tarnovo|BG|1sv|14zf|98ge|5hyj|j64i1x
Turpan|turpan||CN|1v2|dyz1|97ai|j402|j64eoz
Turukhansk|turukhansk||RU|w0|3om|e40e|iuny|j64j9z
Tuscaloosa|tuscaloosa||US|23|2lnh|74d7|-irhu|j648x5
Tuticorin|tuticorin|thoothukudi|IN|1of|9chq|1w20|gqus|j64kuv
Tuxpam|tuxpam|tuxpan|MX|1sy|2c55|4hqc|-kvmc|j64d2n
Tuxpan|tuxpan||MX|16m|k5f|4p7s|-mk9o|j64cyx
Tuxtla Gutiérrez|tuxtla gutierrez||MX|d8|ab8o|3l8s|-jyr0|j64mgd
Tuy Hòa|tuy hoa||VN|1d2|1hp8|2sxw|nfhk|j63tdt
Tuyên Quang|tuyen quang||VN|1rb|s3y|4ock|mjta|j63tbv
Tuymazy|tuymazy||RU|72|1h3x|bpc0|bib3|j64c75
Tuzla|tuzla||BA|1rc|33da|9jr5|404w|j64ion
Tver|tver||RU|1rd|8kt0|c6qg|7oxg|j64lib
Tweed Heads|tweed heads||AU|176|pih|-61gi|wwru|j64i9j
Twin Falls|twin falls||US|ph|10ib|94ei|-oj6m|j648dj
Tyler|tyler||US|1ph|2elx|6xmf|-kfcg|j64juv
Tynda|tynda||RU|2t|st3|btq7|qq90|j64jax
Tyumen|tyumen||RU|1rf|b4jz|c8w8|e1ms|j64ljh
Tzaneen|tzaneen||ZA|ys|1fvx|-53sj|6gsk|j64bnd
Ubá|uba||BR|13l|23hg|-4iyk|-97ek|j64gqb
Ubaitaba|ubaitaba||BR|5z|lw7|-32c8|-8fh0|j647fb
Uberaba|uberaba||BR|13l|5l9n|-48mg|-a9zg|j64kx3
Uberlândia|uberlandia||BR|13l|c2ts|-41u0|-acj4|j64m0l
Ubomba|ubomba|ubombo|ZA|wh|fo|-5wp9|6vk1|j64bnv
Ubon Ratchathani|ubon ratchathani||TH|1rk|5vc5|39o4|mgvg|j64k8t
Udachny|udachny|udachnyy|RU|1hd|bs2|e8iw|o399|j64jct
Udaipur|udaipur||IN|1fe|a2g9|59tc|fswk|j64jsn
Udine|udine||IT|jr|2jtt|9vh8|2u5s|j64693
Udon Thani|udon thani||TH|1rn|5arj|3qao|m14l|j649y7
Uelen|uelen|whalen ugelen|RU|dw|lk|e6g5|-10e9m|j64kdv
Ufa|ufa||RU|72|lths|bqrz|c0e5|j64mej
Uglegorsk|uglegorsk||RU|1he|9rx|aiq9|ufxp|j645qd
Uglich|uglich||RU|1vd|t44|cbv0|87r8|j645cx
Ugolnye Kopi|ugolnye kopi||RU|dw|2lj|dvhh|12354|j64lhx
Uíge|uige||AO|1se|1aaw|-1mso|384k|j64l3d
Uitenhage|uitenhage||ZA|i0|4wmo|-78ho|5fws|j64bub
Ujjain|ujjain||IN|10h|b03q|4yxs|g8ss|j64gdp
Ukhta|ukhta||RU|vh|26uj|dmfk|bi9w|j64j7d
Ukiah|ukiah||US|bb|lh0|8e46|-qep9|j648hv
Ulaan-Uul|ulaan uul||MN|h9|2vi|9i2x|nua5|j64dhx
Ulaanbaatar|ulaanbaatar||MN|1rp|iyvc|a9qq|mwyj|j64mgt
Ulaangom|ulaangom||MN|1sd|rmc|apo9|jqe2|j64jfh
Ulan Hot|ulan hot|ulanhot|CN|16t|56na|9vk0|q5z4|j64ltl
Ulan-Ude|ulan ude||RU|af|7pzq|b3vu|n2fu|j64lkn
Uliastay|uliastay|uliastai|MN|hq|67s|a8fw|kr1j|j64jfb
Ulkan|ulkan||RU|q6|a|bzbw|n3nt|j64cm3
Ulladulla|ulladulla||AU|176|74y|-7krb|w918|j64iaf
Ulm|ulm||DE|5r|3pgb|adgk|255s|j64ekj
Ulsan|ulsan||KR|1rq|mqo8|7man|rpsu|j64j8l
Ulundi|ulundi||ZA|wh|g0h|-62lc|6qd0|j64bnh
Ulyanovsk|ulyanovsk|ul yanovsk|RU|1ro|dqco|bn7o|adj8|j64ljd
Uman|uman||UA|d1|1vmy|ag6v|6h3x|j643y5
Umba|umba||RU|157|4q8|eaim|7d0f|j64j5v
Umeå|umea||SE|1tw|1oc5|doik|4c68|j64k8d
Umm al Abid|umm al abid|umm al ahrar|LY|1gw|8c|5wbm|37zx|j64dcv
Umm al Qaywayn|umm al qaywayn|umm al quwain|AE|1rs|y9n|5h9h|bwnh|j64425
Umm Ruwaba|umm ruwaba||SD|18j|170e|2rm8|6oqo|j64ab3
Umtata|umtata|mthatha|ZA|i0|2yb0|-6ro8|6658|j64kdh
Umuahia|umuahia||NG|3|5o7q|16oo|1lrg|j63w4p
Unalakleet|unalakleet||US|26|kl|doum|-ygnd|j649jh
Unalaska|unalaska||US|26|2r7|bjni|-zoys|j64jxj
Uncia|uncia||BO|1du|3n7|-3yik|-e9no|j6485h
Upata|upata||VE|8y|15f9|1pvw|-ddk4|j6498v
Upernavik|upernavik||GL|1eq|vd|fl12|-c16x|j64lwt
Upington|upington||ZA|18u|1j2l|-63lk|4jt8|j64lgl
Upper Hutt|upper hutt||NZ|11c|u8w|-8tej|11ij6|j64n4h
Uppsala|uppsala||SE|1s0|2upp|ctvt|3s40|j64k8f
Uranium City|uranium city||CA|1j3|2h|crma|-na3a|j64kyv
Uray|uray||RU|ue|urq|cw1l|dvng|j64cef
Urbana|urbana||US|pl|3362|8lho|-iwl6|j6491v
Urgentch|urgentch|urgench|UZ|ul|37tq|8wog|czwg|j64jyn
Urgut|urgut||UZ|1hr|24wr|8g0n|eezj|j6445d
Urmia|urmia|orumiyeh|IR|1ub|cdgb|81l0|9n80|j64713
Uroteppa|uroteppa|istarawshan|TJ|y9|3cul|8k1f|esf3|j649sh
Uruapan|uruapan||MX|13f|5o43|45uk|-lvks|j64cyt
Uruará|uruara||BR|1bs|a|-tjs|-bkwc|j64go7
Urubamba|urubamba||PE|fi|5tg|-2unm|-fgge|j644tj
Uruguaiana|uruguaiana||BR|1g0|2na0|-6dpc|-c8ic|j64grx
Ürümqi|urumqi|rumqi,wulumqi|CN|1v2|24mhk|9e0m|irpv|j64n1n
Uryupinsk|uryupinsk||RU|1tl|w4s|avrq|903j|j64c3x
Urzhar|urzhar||KZ|hw|bfu|a3fe|hho0|j64g41
Uşak|usak||TR|1s3|39y6|8agk|6b08|j64ajx
Usakos|usakos||NA|im|723|-4pqz|3c7s|j64dkh
Ushtobe|ushtobe||KZ|2e|ft8|9p9p|gpmc|j64g4b
Ushuaia|ushuaia||AR|1pu|18rw|-bqrg|-en30|j64l21
Usinsk|usinsk||RU|vh|yq0|e4ny|caxa|j64kfb
Usolye Sibirskoye|usolye sibirskoye||RU|q6|1ua4|bb4y|m7qa|j64j95
Uspallata|uspallata||AR|138|1ue|-6zhn|-ev2s|j647q3
Ussuriysk|ussuriysk||RU|1e5|3d70|9dyo|sao8|j64jbd
Ust-Ilimsk|ust ilimsk|ust ulimsk|RU|q6|25db|cfgc|lzx9|j64lkb
Ust-Kamchatsk|ust kamchatsk||RU|sf|3t7|c1qv|ytcu|j64jg3
Ust-Kut|ust kut||RU|q6|jl8|c602|mo1s|j64j9j
Ust Kuyga|ust kuyga||RU|1hd|165|f097|t2ao|j64cpv
Ust-Maya|ust maya||RU|1hd|2d2|cyhi|su55|j64jbz
Ust-Nera|ust nera||RU|1hd|724|du76|uoxs|j64ll3
Ust-Olenyok|ust olenyok|ust olensk|RU|1hd|a|fn96|po69|j64jcl
Ust' Ordynskiy|ust ordynskiy|ust ordynsky|RU|1s4|b7u|bbnu|mfvc|j640hx
Usti Nad Labem|usti nad labem||CZ|yh|20m1|aux2|30ne|j640m7
Usulután|usulutan||SV|1s6|141y|2uz8|-iycg|j63wyp
Uthai Thani|uthai thani||TH|1s8|h57|3aor|lft4|j649ut
Utica|utica||US|178|294u|98kk|-g4i3|j6497d
Utkholok|utkholok||RU|sf|a|cc28|xp7x|j64dln
Utqiaġvik|utqiagvik||US|26|3cg|fa2y|-xlse|j64mad
Utrecht|utrecht||NL|1s9|dpts|b60b|13i8|j64bb3
Utsunomiya|utsunomiya||JP|1q6|eb8o|7u0s|tz8s|j646pv
Uttaradit|uttaradit||TH|1sb|1n4m|3s1o|lgcs|j649ub
Uummannaq|uummannaq||GL||103|f5by|-b66l|j64l5z
Uvinza|uvinza||TZ|uu|1pzy|-13i4|6iho|j64aq5
Uvira|uvira||CD|1mp|3nh3|-q04|68ug|j64koz
Uyar|uyar||RU|w0|a5r|bymw|k7qp|j64cnb
Uyo|uyo||NG|13|bw62|12n4|1okk|j63w5h
Uyuni|uyuni||BO|1dv|9zf|-4dvc|-ebnw|j6485j
Uzhgorod|uzhgorod|uzhhorod|UA|1qr|38ds|af8c|4rok|j643xp
Uzhur|uzhur||RU|w0|eto|bux8|j927|j64cnf
Vaasa|vaasa||FI|1uq|17zq|divs|4mo0|j64lxx
Vác|vac||HU|1cm|r8d|a8p9|43ms|j64an5
Vacaria|vacaria||BR|1g0|17st|-63wk|-ax20|j64gsn
Vadodara|vadodara|baroda|IN|fo|11mxs|4s5s|fon9|j64l8j
Vadsø|vadso||NO|ji|3yr|f0va|6do9|j64j4l
Vaduz|vaduz||LI||rzt|a3op|21fj|j64itp
Val d'Or|val d or||CA|1fa|fwx|ab9q|-go1u|j64l11
Valdez|valdez||EC|is|8tt|9rz|-gxgf|j64e73
Valdez|valdez||US|26|344|d3q8|-vd8b|j64mah
Valdivia|valdivia||CL|zg|3f5b|-8j26|-fp5u|j64ml1
Valdosta|valdosta||US|kn|1b7f|6lwp|-huky|j648z1
Valença|valenca||BR|5z|1csf|-2v30|-8djk|j64gw5
Valencia|valencia||VE|bt|11xqo|26y7|-ekjw|j64m97
Valencia|valencia||ES|en|hbgg|8gom|-33o|j64mh3
Valera|valera||VE|1r2|43i7|1zww|-f4wo|j6426x
Valladolid|valladolid||ES|c1|6wow|8xdg|-10ng|j64k7v
Valladolid|valladolid||MX|1vq|11en|4fhs|-iwk0|j64d3f
Valle de la Pascua|valle de la pascua||VE|mj|1wqg|1z2c|-e5ew|j64381
Valledupar|valledupar||CO|ch|6lu5|28v4|-fp78|j646eh
Vallegrande|vallegrande||BO|1in|6hy|-3yo0|-dqoc|j64hx5
Vallejo|vallejo||US|bb|34vl|862n|-q7cl|j641fx
Vallenar|vallenar|trehuaco|CL|4v|yn3|-64g4|-f5zk|j64kr1
Valletta|valletta||MT||7w56|7p05|33zv|j64msf
Valparai|valparai||IN|1of|2g78|27ms|ghwk|j64gfd
Valparaíso|valparaiso||CL|1sl|iay8|-72ze|-fcna|j64mkz
Valparaíso|valparaiso||MX|1vx|84x|4vp4|-m75g|j64cwp
Valuyki|valuyki||RU|7o|rov|arez|85yz|j64c4b
Van|van||TR|1sn|7ytd|8916|9avk|j64akn
Van Horn|van horn||US|1ph|1of|6nix|-mgw2|j6422b
Vanadzor|vanadzor||AM|zb|260a|8qww|9j9v|j6483j
Vancouver|vancouver||CA|9r|1dkz4|ak7m|-qe10|j64n2b
Vancouver|vancouver||US|1u8|b9pm|9s33|-qaao|j64l9d
Vanhynsdorp|vanhynsdorp|vanrhynsdorp|ZA|1up|2kj|-6rye|40jp|j64kbz
Vanimo|vanimo||PG|1ic|8n8|-kr8|uab4|j63vx3
Vanino|vanino||RU|ub|ed6|aird|u249|j645px
Vannersborg|vannersborg|vanersborg|SE|1tz|guj|ciby|2n50|j63wep
Varamin|varamin||IR|1p6|3ukz|7ki6|b2ia|j64707
Varanasi|varanasi|benares|IN|1sa|sz7k|5fgn|hsf1|j64mmb
Varna|varna||BG|1sp|6pc2|99gc|5z8p|j64i2b
Varnek|varnek||RU|16v|a|ey1h|cvgc|j64c8f
Várzea Grande|varzea grande||BR|12q|5cpk|-3cr8|-c16g|j6478h
Vaslui|vaslui||RO|1sr|1hex|9ztp|5xzp|j63ut5
Västerås|vasteras|vasteraas|SE|1ty|2apm|cs3w|3jmg|j643vj
Vatican City|vatican city||VA|y3|n4|8zbt|2o3a|j644az
Växjö|vaxjo||SE|w2|19zk|c6x1|36br|j649ln
Vegreville|vegreville||CA|29|4hh|bgt4|-o0l0|j647i3
Veinticinco de Mayo|veinticinco de mayo|25 de mayo|AR|e4|j18|-7ldo|-cwco|j647t5
Vejle|vejle||DK|1nf|13hl|bxuq|21km|j63ybf
Velikiy Novgorod|velikiy novgorod|nizhniy novgorod,novgorod,veliky novgorod|RU|194|4orh|cje0|6pqs|j64j5z
Velikiy Ustyug|velikiy ustyug|veliky ustyug|RU|1tm|pn9|d0w7|9x8r|j64kej
Velikiye Luki|velikiye luki||RU|1ec|27l9|c2kg|6jhs|j64j61
Vellore|vellore||IN|1of|3smx|2rp0|gyq4|j64ge3
Velsk|velsk||RU|4a|kak|d376|90tq|j64ke7
Venado Tuerto|venado tuerto||AR|1io|1jtg|-78ew|-da5w|j64hiz
Venice|venice||IT|1sw|5syo|9qlv|2n6e|j64m2t
Ventspils|ventspils||LV|1sx|x38|catn|4md2|j64bbv
Vera|vera||AR|1io|7p7|-6bd2|-cwmu|j64hip
Veracruz|veracruz||MX|1sy|ceqb|43z1|-klz4|j64mgb
Vereeniging|vereeniging||ZA|kg|n0pc|-5pm5|5zq4|j64j5h
Vergara|vergara||UY|1qv|332|-7238|-bka4|j64105
Verkhnevilyuysk|verkhnevilyuysk||RU|1hd|4w5|dljt|psdb|j64cq5
Verkhniy Ufaley|verkhniy ufaley|verkhny ufaley|RU|d0|q53|c0lz|cwqx|j645ht
Verkhnyaya Salda|verkhnyaya salda||RU|1nc|11sw|cfx2|cz7e|j64caf
Verkhoyansk|verkhoyansk||RU|1hd|12k|eh6f|sl7e|j64jbj
Vernal|vernal||US|1s7|b2p|8o5m|-nh4g|j648mz
Vernon|vernon||US|1ph|8zw|7bif|-la4o|j64233
Vero Beach|vero beach||US|jl|1udz|5xaf|-h8av|j648yx
Verona|verona||IT|1sw|7g3n|9qmc|2css|j64dub
Versailles|versailles||FR|1x2|1two|agjp|ggl|j64fpp
Veszprém|veszprem||HU|1t5|1buv|a3cu|3u7a|j63u4n
Viacha|viacha||BO|x6|qu0|-3kh0|-en07|j64851
Viana|viana||BR|11w|kld|-ork|-9n80|j64gmz
Viana Do Castelo|viana do castelo||PT|1t7|c03|8xqa|-1w8p|j63vdd
Vibo Valentia|vibo valentia||IT|b8|q79|8acq|3g88|j6467j
Viborg|viborg||DK|13i|qvj|c3fx|20j4|j6473b
Vicente Guerrero|vicente guerrero||MX|61|9wd|6ldl|-ov4t|j645ql
Vichuga|vichuga||RU|qh|u5b|c9i7|8ziv|j64bz5
Vichy|vichy||FR|59|xau|9vub|qd3|j64foj
Vicksburg|vicksburg||US|13t|jtx|6xmt|-jh7t|j64jvn
Victor Harbor|victor harbor||AU|1lj|5zk|-7mdo|tpkt|j64igj
Victoria|victoria||CA|9r|67h5|adpp|-qfrw|j64mnz
Victoria|victoria||US|1ph|1djl|669e|-kshd|j64iyn
Victoria|victoria||SC||pwo|-zme|bvus|j64ms7
Victoria|victoria||AR|ij|jeb|-6zmc|-cwco|j647y1
Victoria|victoria||CL|x1|iy3|-8723|-fi6g|j64fsh
Victoria Falls|victoria falls||ZW|12l|rld|-3ucg|5jds|j64a4z
Victoriaville|victoriaville||CA|1fa|w0s|9vbs|-ffar|j64h5f
Victorica|victorica||AR|x5|3fu|-7rg3|-e10k|j64hff
Victorville|victorville||US|bb|1sfc|7ehh|-p50n|j648gb
Vicuña|vicuna||CL|ew|aew|-6fpj|-f5u0|j64frv
Viedma|viedma||AR|e4|19ma|-8qtc|-di40|j64k2x
Vienna|vienna||AT|1uv|1ffuo|abxg|3i9r|j64n2j
Vientiane|vientiane||LA|1t9|g5sg|3umr|lzo0|j64mmn
Việt Trì|viet tri||VN|1d1|7i28|4kl4|mli4|j649yv
Vigan|vigan||PH|po|11gh|3rlv|pswt|j64j8v
Vigo|vigo||ES|k7|84eg|91rs|-1vd0|j64lfd
Vijayapura|vijayapura||IN|t6|5t5k|3lwi|g86k|j64jp7
Vijayawada|vijayawada|bezawada,bezwada|IN|33|odbc|3jhf|ha4p|j64lv7
Vikhorevka|vikhorevka||RU|q6|4m|c0tf|lp6z|j64cmh
Vila Real|vila real||PT|1ta|d49|8umk|-1np6|j63vin
Vila Velha|vila velha||BR|2n|pwxv|otj|-az6v|j64l0j
Vila Velha|vila velha||BR|iu|pwxv|-4d5o|-8n3g|j64m1b
Vilanculos|vilanculos|vilankulo|MZ|px|4x|-4pqz|7ki6|j64btz
Vilhena|vilhena||BR|1gd|1csf|-2q4e|-cvv2|j64mnb
Viljandi|viljandi||EE|1tb|fo5|cic7|5hgc|j63xzh
Villa Ahumada|villa ahumada|miguel ahumada|MX|db|772|6k6w|-mtu4|j64cud
Villa Ángela|villa angela||AR|ck|n6r|-5wu1|-d0hr|j647x5
Villa Carlos Paz|villa carlos paz||AR|fn|1hl7|-6qfs|-dtoo|j647vf
Villa Constitución|villa constitucion||AR|1io|y5r|-74ek|-cxnw|j647yf
Villa Hayes|villa hayes||PY|1e2|c2j|-5dlg|-cbwk|j644x3
Villa María|villa maria||AR|fn|1zc5|-6y2s|-dk48|j647v1
Villa Martin|villa martin|colcha k|BO|1du|a|-4g8h|-ej0p|j6485n
Villa O'Higgins|villa o higgins||CL|1in|6y|-adz1|-fk4q|j64had
Villa Rumipal|villa rumipal||AR|ax|z9|-6wbt|-dtk1|j647vb
Villa Unión|villa union||MX|1kj|bwz|4z0g|-mroc|j645sd
Villahermosa|villahermosa||MX|1ns|96ok|3uw0|-jwtk|j64jef
Villalonga|villalonga||AR|e4|26u|-8jql|-dew9|j64hfb
Villamontes|villamontes||BO|1os|eh5|-4jyo|-dlyw|j64hxj
Villanueva|villanueva||MX|1vx|8le|4sgc|-m1ts|j645td
Villarica|villarica|villarrica|CL|x1|odu|-8f34|-fhbw|j646w1
Villarrica|villarrica||PY|m3|vr9|-5ios|-c3fx|j64j3n
Villavicencio|villavicencio||CO|13b|8163|w1p|-fs66|j64ji3
Vilnius|vilnius||LT|1td|bmhq|bpxu|5fce|j64mhl
Vilyuysk|vilyuysk||RU|1hd|7oc|dnxt|q2go|j64jc7
Viña del Mar|vina del mar||CL|1sl|asj2|-72v0|-fc08|j646vh
Vinh|vinh||VN|17a|cq25|40ag|mnfk|j64j1f
Vĩnh Long|vinh long||VN|1te|27pu|274w|mpmg|j63tg7
Vinnytsya|vinnytsya|vinnytsia|UA|1tf|7joz|ajtq|63rk|j649ol
Virginia|virginia||US|13m|6px|a6p1|-ju0k|j648bd
Virginia Beach|virginia beach||US|1tg|vygo|7wdk|-ga9n|j64izt
Visalia|visalia||US|bb|2m40|7saa|-pknc|j648gj
Visby|visby||SE|lh|hfl|ccpd|3x7c|j649mh
Viseu|viseu||PT|1th|kcc|8ppm|-1p18|j63vih
Viseu|viseu||BR|1bz|emm|-98d|-9w0o|j64gn7
Vishakhapatnam|vishakhapatnam|visakhapatnam|IN|33|wrs8|3stk|hurq|j64mkj
Vitim|vitim||RU|1hd|2yr|cqqb|o4i2|j64cqb
Vitória|vitoria||BR|iu|10itc|-4ct0|-8nhb|j64k11
Vitoria|vitoria|grande vitpria,vitoria gasteiz|ES|1c8|4taa|96ms|-klo|j644al
Vitória da Conquista|vitoria da conquista||BR|5z|6lt8|-36l0|-8r4g|j64m15
Vitsyebsk|vitsyebsk|vitebsk|BY|1ti|7cfg|btu7|6gwt|j64l4v
Vizianagaram|vizianagaram||IN|33|3ue6|3vtg|hwag|j64fi7
Vladikavkaz|vladikavkaz||RU|18l|7tcm|986g|9koc|j64bvt
Vladimir|vladimir||RU|1tj|6tvc|c13o|8nsz|j64kex
Vladivostok|vladivostok||RU|1e5|cky6|98sk|s9to|j64mfn
Vlorë|vlore||AL|1tk|1x3e|8obq|46g6|j64831
Voi|voi||KE|ea|s5j|-q00|89lw|j64bk3
Voinjama|voinjama||LR|z2|kiq|1sxz|-238c|j63wiz
Volgodonsk|volgodonsk||RU|1gg|3lf7|a6l8|91b3|j64kep
Volgograd|volgograd||RU|1tl|l39c|afv4|9jck|j64meh
Volkhov|volkhov||RU|ya|z8p|cuez|6xiz|j64bxv
Volksrust|volksrust||ZA|150|xgy|-5v3w|6ems|j64bmf
Vologda|vologda||RU|1tm|6bjd|cov8|8k0w|j64lid
Volos|volos||GR|1pl|2dd4|8fs4|4x30|j646yp
Volsk|volsk||RU|1iz|1iec|b5i3|a5jj|j64cd7
Volta Redonda|volta redonda||BR|1g1|9s4q|-4trg|-9g8m|j64gxf
Volzhskiy|volzhskiy|volzhsky|RU|1tl|6xgd|agi4|9lhc|j64c3l
Vorkuta|vorkuta||RU|vh|1prb|egu0|dpwk|j64liz
Voronezh|voronezh||RU|1tr|i38g|b35z|8ezt|j64lit
Vorontsovo|vorontsovo||RU|1p3|2s|fd87|hwsa|j64ja1
Vossavangen|vossavangen|vossevangen|NO|oj|4ar|czto|1dp6|j63vo7
Vostok Station|vostok station|vostok|AQ||p|-gtg7|mw2o|j64iuz
Votkinsk|votkinsk||RU|1rm|243t|c81s|bkl8|j64cbb
Voznesensk|voznesensk||UA|15d|xy4|a6wg|6prp|j649n7
Vratsa|vratsa||BG|1tt|1j9t|99es|51t5|j64873
Vryburg|vryburg||ZA|18n|129g|-5s0w|5atg|j64kcf
Vryheid|vryheid||ZA|wh|37r0|-5y74|6lks|j64kcx
Vung Tau|vung tau||VN|am|5by7|27wi|my9u|j64a0f
Vyazemskiy|vyazemskiy|vyazemsky|RU|ub|brj|a6rk|svpv|j64crh
Vyazma|vyazma||RU|1kz|16to|bu0q|7cli|j64byx
Vyborg|vyborg||RU|ya|2ifl|d0e7|65vh|j64kdz
Vyshnniy Volochek|vyshnniy volochek|vyshny volochyok|RU|1rd|15ig|ccba|7eov|j645cn
Vyska|vyska|vyksa|RU|17t|1bkw|buvz|91cc|j64bzn
Wa|wa||GH|1rz|1o9n|25mk|-jag|j64fej
Wabag|wabag||PG|ii|31y|-16d0|usxo|j63vwj
Waco|waco||US|1ph|3l4j|6rfo|-ktl4|j64iyv
Wadi Halfa|wadi halfa||SD|18s|d7l|4o7k|6pwc|j64kax
Wafangdian|wafangdian||CN|yg|7mkk|8hr7|q5bs|j646l3
Wagga Wagga|wagga wagga||AU|176|16qd|-7j06|vkvs|j64idx
Wagin|wagin||AU|1uo|18e|-74xw|p5h8|j64i7b
Wahiawa|wahiawa||US|ns|3qum|4lx3|-xvbg|j648d3
Wailuku|wailuku||US|ns|148k|4h77|-xjlj|j648d7
Waingapu|waingapu|kota waingapu|ID|19g|11oc|-22iu|prvm|j64e1x
Wainwright|wainwright||US|26|4u|f51d|-yav3|j64jxt
Waitakere|waitakere|waitakere city,western auckland|NZ|55|4gkk|-7wcs|11evb|j64n4n
Waitangi|waitangi||NZ|cy|8c|-9fpj|-11svk|j64n7d
Wajir|wajir||KE|18p|zbf|di8|8l10|j64bah
Wakayama|wakayama||JP|1u2|9fie|7c2f|syyl|j64f5j
Wakema|wakema||MM|5d|11cl|3k6t|kefp|j64iqf
Waku Kungo|waku kungo||AO|fd|9b9|-2fnf|38o0|j64hs3
Wales|wales||US|26|2r|e28w|-100yz|j649k5
Walla Walla|walla walla||US|1u8|yu6|9vfw|-pd4r|j648ef
Wallace|wallace||US|ph|sk|a6ba|-ouhx|j6419f
Wallaroo|wallaroo||AU|1lj|257|-79tt|thzh|j64iej
Walvis Bay|walvis bay||NA|im|1462|-4x53|33x9|j64lnh
Wamba|wamba|wamba territory|CD|1an|35br|gik|5zz0|j64ejj
Wanaka|wanaka||NZ|1ay|3vx|-9kw4|1094p|j64n77
Wangaratta|wangaratta||AU|1t8|ati|-7sk0|vcuw|j64m6b
Wangdue Prodrang|wangdue prodrang|wangdue phodrang|BT|1u4|3uw|5vod|j9sv|j63znl
Wangqing|wangqing||CN|r8|1wgs|9aao|rt1b|j64ezb
Wanzhou|wanzhou|wanxian|CN|dt|100ao|6lt4|n8f4|j64jgn
Warangal|warangal||IN|1p9|pswd|3uys|h21k|j64jp3
Warri|warri||NG|g9|hsii|16lc|18g0|j64lmv
Warrnambool|warrnambool||AU|1t8|n3c|-8854|ujb0|j64k5v
Warsaw|warsaw||PL|12i|10l4o|b76f|4i0t|j64mv7
Warwick|warwick||AU|1f2|9iz|-61tg|wkzv|j64ijx
Wasa Station|wasa station|wasa research station|AQ||a|-fnnk|-2viv|j64ivh
Washington,  D.C.|washington d c|washington|US|gs|2kz80|8c5z|-gi82|j64n2t
Wasilla|wasilla||US|26|6kp|d761|-w12y|j649kf
Watampone|watampone||ID|1mv|1qzh|-yz4|pshy|j64e2j
Waterbury|waterbury||US|er|3qfw|8wlo|-fnno|j64293
Waterford|waterford||IE|ux|120r|b787|-1ivj|j6466x
Waterloo|waterloo||US|q1|23vv|93vo|-jsis|j648of
Watertown|watertown||US|178|q3h|9fbc|-g9qf|j6497h
Waterville|waterville||US|10z|jeo|9jrj|-exe2|j643aj
Watsa|watsa||CD|1an|ix0|ngg|6bus|j64knx
Watson Lake|watson lake||CA|1vr|ma|cvv2|-rlts|j64l0d
Wau|wau||SS|1uc|2qag|1new|5zz0|j64mcn
Waukegan|waukegan||US|pl|4abk|92vs|-ittb|j64927
Waukesha|waukesha||US|1uw|5cu0|97vp|-iwsq|j642yj
Wausau|wausau||US|1uw|1m72|9mwo|-j7l8|j64jwl
Wawa|wawa||CA|1aa|1oe|aadg|-i66x|j64h35
Waycross|waycross||US|kn|fao|6oui|-hngd|j642ix
Weifang|weifang||CN|1js|xaaw|7vco|piyu|j64jm3
Weihai|weihai||CN|1js|c0an|81co|q64o|j64koh
Weinan|weinan||CN|1jm|3oyp|7e7g|ngwp|j64epp
Weipa|weipa||AU|1f2|26m|-2pqi|uene|j64k6l
Welkom|welkom||ZA|1ae|99ag|-5ztg|5q90|j64lgz
Wellington|wellington||NZ|11c|8fjs|-8uo8|11gmx|j64n6b
Wenatchee|wenatchee||US|1u8|1cbl|a5x8|-psb6|j64jtn
Wenshan|wenshan|wenshan city|CN|1vt|39l0|50cc|mce9|j64esh
Wenzhou|wenzhou||CN|1wg|1ed9s|607v|puxd|j64lsz
West Bend|west bend||US|1uw|qn6|9b2p|-iwfd|j6495b
West Palm Beach|west palm beach||US|jl|qsi8|5qd6|-h68k|j64jv7
Westport|westport||NZ|1ue|30c|-8y92|10s3g|j64n51
Wetaskiwin|wetaskiwin||CA|29|94f|bcoy|-oavd|j647ih
Wete|wete||TZ|tf|keq|-132j|8iiy|j63wan
Wewak|wewak||PG|hy|jef|-rf3|usb3|j64kd1
Weyburn|weyburn||CA|1j3|782|an8a|-m9b8|j647hh
Whakatane|whakatane||NZ|7f|efg|-84vq|11xlw|j64n4t
Whanganui|whanganui|wanganui|NZ|11c|xc0|-8k4e|11im1|j64n5b
Whangarei|whangarei||NZ|18y|14a0|-7nns|11d32|j64n5t
Wheeling|wheeling||US|1ul|14i4|8l4z|-hauj|j64961
White Sulphur Springs|white sulphur springs||US|1ul|1uv|83mb|-h7mj|j64315
Whitehorse|whitehorse||CA|1vr|hyk|d0hr|-sy1w|j64mod
Whittier|whittier||US|26|4x|d10i|-vv7d|j643rf
Whyalla|whyalla||AU|1lj|hen|-72tm|thfi|j64m63
Wiarton|wiarton||CA|1aa|1om|9l61|-he11|j64h4j
Wichita|wichita||US|sr|8m2b|831s|-kv04|j64iyb
Wichita Falls|wichita falls||US|1ph|263g|79og|-l3z7|j64iyt
Wick|wick||GB|o7|5ij|civh|-nsi|j64j2n
Wiener Neustadt|wiener neustadt||AT|17j|1ruy|a8y8|3hdw|j6487d
Wiesbaden|wiesbaden||DE|o3|d86e|aqf8|1rno|j64ekz
Wilcannia|wilcannia||AU|176|ca|-6rke|uqcp|j64i9t
Wilkes-Barre|wilkes barre||US|1cd|3em9|8ua2|-g9h7|j6498l
Willcox|willcox||US|48|3yy|6wv8|-njgq|j648ff
Willemstad|willemstad||CW||35a5|2m50|-esk8|j64itj
Williams Lake|williams lake||CA|9r|axk|b64v|-q6ik|j64kzf
Williamsport|williamsport||US|1cd|17vx|8u7v|-gi5a|j6435p
Williston|williston||US|18f|ags|abkw|-m7lk|j648cv
Willmar|willmar||US|13m|e95|9o5v|-kdcx|j6415p
Wilmington|wilmington||US|g7|3gns|8ion|-g6x9|j6496j
Wilmington|wilmington||US|18e|3gns|7c33|-gpfe|j64lbf
Winchester|winchester||US|1tg|15md|8eaz|-gr4y|j6494x
Windhoek|windhoek||NA|uj|5qw4|-4u5g|3ntf|j64mgx
Windorah|windorah||AU|1f2|4e|-5g8s|ukp2|j64m6d
Windsor|windsor||CA|193|2zc|9n2m|-dqtn|j64h6z
Winneba|winneba||GH|cb|y5a|15a8|-4v0|j64fex
Winnemucca|winnemucca||US|16z|7gi|8s5i|-p8g3|j648k5
Winnipeg|winnipeg||CA|11m|djpb|aowe|-ktqk|j64mnl
Winona|winona||US|13m|pdt|9fw8|-jn3c|j648bh
Winslow|winslow||US|48|7nv|7i8s|-nq54|j648f1
Winston-Salem|winston salem||US|18e|61cj|7qla|-h7ag|j6493h
Winter Haven|winter haven||US|jl|2c1w|607v|-hinm|j642c1
Winton|winton||AU|1f2|w5|-4su4|unnh|j64ijj
Wiseman|wiseman||US|26|e|eg55|-w68j|j649l5
Witu|witu||KE|ea|45g|-id0|8nyk|j64bjz
Wollongong|wollongong||AU|176|5lbm|-7dju|wc9w|j64k5l
Wonju|wonju||KR|kb|57sr|808f|rf6s|j644j1
Wonsan|wonsan||KP|so|720n|8e5x|rb9g|j64ln5
Wonthaggi|wonthaggi||AU|1t8|4m9|-89wv|v7do|j64ihx
Woodward|woodward||US|1a3|9z7|7t4e|-layh|j648rj
Woomera|woomera|woomera village|AU|1lj|ci|-6oco|tbk0|j64ig1
Worcester|worcester||US|12j|65qd|925s|-fe0g|j648wn
Worcester|worcester||ZA|1up|2qgd|-77kg|45zz|j64lgn
Wrangell|wrangell||US|26|1li|c3qh|-sddw|j649hl
Wrocław|wroclaw||PL|zp|dlvx|aydc|3nek|j64dez
Wuchuan|wuchuan||CN|16t|icg|8t3f|nvvs|j646np
Wuhai|wuhai||CN|16t|4ojf|8i1z|mw62|j64jnd
Wuhan|wuhan||CN|ox|4b8qg|6jz0|ohp5|j64mx3
Wuhu|wuhu|wuhu anhui|CN|36|hd00|6px0|pdc0|j64jgt
Wukari|wukari||NG|1om|1zph|1oq8|23go|j64d7h
Wum|wum||CM|184|1h44|1ddw|25p8|j64hln
Wuppertal|wuppertal||DE|189|gn65|azg4|1jbo|j646fp
Würzburg|wurzburg||DE|7i|3m29|ao9g|24rw|j64emz
Wuwei|wuwei||CN|kc|akh0|84nk|lzze|j64lop
Wuxi|wuxi|wuxi jiangsu|CN|r3|11hjc|6ror|ps84|j64l7h
Wuyuan|wuyuan||CN|16t|n6x|8t1s|n7fm|j64f11
Wuzhou|wuzhou||CN|m7|9haj|5168|nuy8|j64lp5
Wyndham|wyndham||AU|1uo|m8|-3amk|rifl|j64k51
Xai-Xai|xai xai||MZ|kh|2rdx|-5d7k|77kg|j64lh1
Xaignabouri|xaignabouri|sainyabuli|LA|1v0|ci0|44jd|lt3x|j64dhb
Xalapa|xalapa|jalapa|MX|1sy|9owq|46p0|-kru8|j645z3
Xam Nua|xam nua|xam neua|LA|ol|u34|4djb|maq5|j63y8x
Xangongo|xangongo||AO|fg|cf|-3l60|37ic|j64l3j
Xanthi|xanthi||GR|2z|130q|8tga|5c04|j64fvj
Xapeco|xapeco|chapeco|BR|1im|3fkt|-5t3s|-ba68|j64k0n
Xiamen|xiamen||CN|ju|1hzo8|58o7|pb3h|j64l6x
Xian|xian|xi an,xi an shaanxi|CN|1jm|2dxd4|7che|nc83|j64mwz
Xiangtai|xiangtai|xingtai|CN|nu|d40r|7xvo|ojhk|j64ett
Xiangtan|xiangtan||CN|p0|1jg3o|5yw8|o754|j64ert
Xiangyang|xiangyang|xiangfan|CN|ox|mwug|6v2z|o16p|j64kob
Xiantao|xiantao|xiantao city|CN|ox|xcm8|6ics|obal|j64jjp
Xianyang|xianyang||CN|1jm|o4ts|7d0z|nau0|j64ko7
Xiaogan|xiaogan||CN|ox|3fsl|6ml0|oeuw|j64eqz
Xichang|xichang||CN|1k9|857d|5z4g|lxco|j64lsd
Xigaze|xigaze||CN|1v3|1pq8|69p0|j1tt|j64lrl
Xilinhot|xilinhot||CN|16t|2lc5|9f2r|ovej|j64jnn
Xinguara|xinguara||BR|1bs|34f|-1ise|-apeg|j64gnz
Xingyi|xingyi|xingyi guizhou|CN|mg|hhmo|5dm4|mhbl|j64jgh
Xining|xining||CN|kc|mgn4|7ukr|lt8x|j64mhv
Xinqing|xinqing||CN|nw|16rb|ac6z|rr9v|j64f3n
Xinxiang|xinxiang||CN|nx|jcrc|7kjs|oem0|j64jlh
Xinyang|xinyang||CN|nx|x11k|6vxn|og5k|j64jlf
Xinyi|xinyi||CN|r3|kmsg|7da0|pd70|j646lh
Xinyu|xinyu||CN|r4|jkh4|5yis|omsg|j64jmd
Xinzhou|xinzhou||CN|1ju|5zqv|88dk|o5r4|j64epz
Xique-Xique|xique xique||BR|5z|rc9|-2bhk|-95pg|j64kyb
Xuanhua|xuanhua||CN|nu|8s5t|8p88|onj7|j646kn
Xuanzhou|xuanzhou|xuancheng|CN|36|ik7k|6mug|pgb1|j64kkj
Xuchang|xuchang||CN|nx|9mne|7ai4|oe8o|j64eu5
Xuzhou|xuzhou||CN|r3|18tfc|7cis|p45h|j64l7f
Yaan|yaan|ya an|CN|1k9|7acg|6fbw|m3dc|j64es1
Yacuíba|yacuiba||AR|1hk|1rw3|-4pzg|-dnig|j647wb
Yakeshi|yakeshi||CN|16t|2hq4|ak90|pvk4|j64f0t
Yakima|yakima||US|1u8|24lz|9zl2|-pttj|j64jtl
Yako|yako||BF|1c1|ho8|2ryc|-hgm|j63zw1
Yakossi|yakossi||CF|12y|dw|17ca|4zwv|j64dtl
Yakutat|yakutat||US|26|31|crgx|-ty54|j649kt
Yakutsk|yakutsk||RU|1hd|51sg|dany|rt1i|j64mft
Yala|yala||TH|1v6|36b0|1ejl|lpir|j649tb
Yalta|yalta||RU|f8|1pcl|9jcx|7bkq|j64jy7
Yalutorovsk|yalutorovsk||RU|1rf|rp0|c5ao|e7k7|j64cfn
Yamagata|yamagata||JP|1v7|5u1d|87ap|u2ps|j64f65
Yamba|yamba||AU|176|1e6|-6b12|wva5|j64idn
Yambio|yambio||SS|1ug|v5q|z9l|639f|j64kaj
Yamburg|yamburg||RU|1v9|11ew|ek39|g24l|j64c8n
Yamoussoukro|yamoussoukro||CI|xf|4fc3|1gm0|-14pf|j64mmv
Yanbu al Bahr|yanbu al bahr|yanbu governorate|SA|1p|5qh2|55wv|85l9|j6450t
Yancheng|yancheng|yancheng jiangsu|CN|r3|hzdk|75mb|pqvl|j64kol
Yandoon|yandoon||MM|5d|rws|3ni9|khzh|j64iqv
Yangambi|yangambi||CD|1an|rez|5y0|58i4|j64eix
Yangjiang|yangjiang||CN|m6|ip4b|4olk|nzys|j64dxv
Yangmei|yangmei||TW|1ok|3r14|5c9b|pyss|j640w7
Yangon|yangon|rangoon|MM|1vb|2fmbk|3lil|km0f|j64n05
Yangquan|yangquan||CN|1ju|l1ag|847g|ocb8|j646jb
Yangzhou|yangzhou||CN|r3|bkg3|6y00|plj0|j646ll
Yanji|yanji||CN|r8|ah44|96vr|rrbs|j646mp
Yankton|yankton||US|1ln|c0s|96vo|-kvhh|j648rt
Yantai|yantai||CN|1js|19cps|81lo|q0pp|j64l77
Yaoundé|yaounde||CM|ce|yj20|tum|2guj|j64mq3
Yarmouth|yarmouth||CA|193|5sc|9e78|-e64m|j64l1h
Yaroslavl|yaroslavl||RU|1vd|d05m|cclk|8jn0|j64lif
Yarumal|yarumal||CO|3c|r8z|1i8y|-g79d|j64e4n
Yasothon|yasothon||TH|1ve|gp7|3dtk|mbmu|j63v4h
Yasuj|yasuj||IR|vf|22oi|6kke|b23o|j640qd
Yaupi|yaupi||EC|14m|85|-m0v|-gpcz|j64e41
Yaynangyoung|yaynangyoung|yenangyaung|MM|10r|2dax|4dvr|kc3u|j64ird
Yazd|yazd||IR|1vg|a8r5|6uap|bnis|j64lyj
Yazdan|yazdan|hesar e yazdan|IR|1ls|1jk|76jd|d1uy|j64g8j
Ye|ye||MM|142|1372|39p1|kz5j|j64iq1
Yefremov|yefremov||RU|1r5|z3t|be3n|865b|j64c2z
Yeghegnadzor|yeghegnadzor||AM|1su|6bs|8isr|9psl|j63z4l
Yegoryevsk|yegoryevsk||RU|14o|1xab|bvco|8d5i|j64c1l
Yei|yei||SS|cc|3yqw|vk8|6kq8|j64a97
Yekaterinburg|yekaterinburg|sverdlovsk|RU|1nc|s548|c6o8|czks|j64mel
Yelets|yelets||RU|yv|2hfz|b9pk|892g|j645d3
Yélimané|yelimane||ML|tq|rg|38rt|-29j6|j64d5d
Yellowknife|yellowknife||CA|18z|eua|ddt0|-oioy|j64mo7
Yemanzhelinsk|yemanzhelinsk||RU|d0|wfb|bqg1|d4xz|j64c7j
Yên Bái|yen bai||VN|1vu|22ho|4nh6|mh7y|j63tch
Yendi|yendi||GH|18s|x5o|20sh|-4n|j64fe5
Yeniseysk|yeniseysk||RU|w0|fdc|cj0j|jr31|j64j9v
Yeosu|yeosu||KR|ml|7bvu|7g14|rdoy|j64aih
Yeppoon|yeppoon||AU|1f2|8b5|-4yht|wb8v|j64imf
Yerema|yerema||RU|q6|kp|cxwg|n3mq|j64j91
Yerevan|yerevan||AM|il|nmb4|8m1z|9jgc|j64mq7
Yessey|yessey||RU|iz|a|eof9|lwbm|j64clz
Yevlax|yevlax|yevlakh|AZ|1vh|15g4|8pek|a3t8|j6483t
Yevpatoriya|yevpatoriya|yevpatoria|RU|f8|296v|9oqp|75fj|j649mp
Yeysk|yeysk||RU|vz|1vra|a0bw|878q|j64c53
Ygatimí|ygatimi||PY|bk|261|-55ss|-bw8o|j64b4x
Yian|yian|yi an|CN|nw|ut0|a9g4|qutk|j64f23
Yibin|yibin||CN|1k9|jbzk|6607|meup|j64jkj
Yichang|yichang||CN|ox|ir5k|6kwb|numl|j64jjn
Yichun|yichun|yichun jiangxi|CN|r4|l1ps|5ys1|oip9|j64koj
Yichun|yichun|yichun heilongjiang|CN|nw|gnjc|a82j|rml0|j64jnv
Yilan|yilan|yilan city|TW|1vj|37qo|5az0|q3fg|j640wl
Yinchuan|yinchuan||CN|17q|l8ns|88u3|mrzr|j64mjt
Yingkow|yingkow|yingkou|CN|yg|h1fc|8ptv|q7i5|j64jlp
Yining|yining|yining city|CN|1v2|bmln|9eqg|hfp8|j64lrp
Yirga Alem|yirga alem|irgalem|ET|1m3|s04|1g34|88dg|j64fxl
Yishan|yishan||CN|m7|10ba|591o|nah7|j64dvj
Yishui|yishui|yishui county|CN|1js|20mb|7o5s|pfa0|j64ev1
Yitulihe|yitulihe||CN|16t|f5p|autw|q1mn|j64f0n
Yiyang|yiyang|yiyang hunan|CN|p0|sz7k|64p4|o2q9|j64jk1
Yogyakarta|yogyakarta|yogyakarta city|ID|1vl|dn90|-1o14|nnnq|j64kj5
Yokohama|yokohama||JP|sj|279ba|7ldv|tx6c|j64jof
Yola|yola||NG|e|222u|1z2c|2oao|j64khp
Yomou|yomou||GN|19j|2se|1mew|-1zj0|j64gj5
Yongzhou|yongzhou||CN|p0|lfls|5mer|nx91|j64jjz
Yopal|yopal||CO|bz|1b39|159a|-fios|j640kh
York|york||US|1cd|4o7u|8kct|-gg1c|j6497z
York|york||GB|1vm|3en7|bkfs|-8c0|j64adb
Yorkton|yorkton||CA|1j3|bpg|az6z|-lymx|j64gyn
Yoro|yoro||HN|1vn|c66|387c|-ipj8|j63th1
Yoshkar Ola|yoshkar ola|yaskar ola|RU|122|6yba|c502|a9el|j64c9n
Young|young||AU|176|5sd|-7cqg|vs7o|j64ib3
Youngstown|youngstown||US|19y|6oqe|8t4l|-haap|j64jw5
Yozgat|yozgat||TR|1vo|1vt5|8j8k|7gmu|j63ttp
Ypacaraí|ypacarai||PY|4q|n9i|-5g2c|-c9z4|j644y5
Ype Jhu|ype jhu|ypehu|PY|bj|go|-54ho|-bvxk|j644zb
Yuba City|yuba city||US|bb|2ho9|8e0i|-q2e6|j648h1
Yuci|yuci||CN|1ju|i05c|82rb|o5td|j64jjh
Yueyang|yueyang||CN|p0|hpcg|6apo|o8o5|j64ls5
Yulara|yulara||AU|18x|pu|-5er9|s2pt|j64k3z
Yulin|yulin|yulin guangxi|CN|m7|o5lk|4umn|nlwp|j64lp1
Yulin|yulin||CN|1jm|3cc8|87e9|niph|j64lrz
Yuma|yuma||US|48|1zd5|7079|-okfw|j64ixf
Yumen|yumen|yumen city|CN|kc|7i28|8jbw|ky38|j6469d
Yunxian|yunxian|yun county|CN|ox|2v1y|715e|nr1k|j64er7
Yurga|yurga||RU|u0|1szg|bxze|i6za|j64cgz
Yuscarán|yuscaran||HN|ic|1tv|2zlc|-im5a|j63tjn
Yuxi|yuxi||CN|1vt|8ht1|5848|lzfo|j64jkp
Yuzhno Sakhalinsk|yuzhno sakhalinsk||RU|1he|3s6c|a2du|ule0|j64lll
Zabīd|zabid||YE|1e|39o8|31j3|9a83|j649gz
Zabol|zabol||IR|1ks|50j4|6nd3|d6e7|j64kup
Zacapa|zacapa||GT|1vw|rug|37iw|-j6t6|j63xn3
Zacatecas|zacatecas||MX|1vx|50xd|4vp4|-lzig|j64cwh
Zacatecoluca|zacatecoluca||SV|x6|ukd|2w88|-j1pk|j63wwp
Zadar|zadar||HR|1vy|1ize|9gfl|39rj|j64efj
Zagazig|zagazig||EG|4j|63zd|6jzd|6r6n|j63x9n
Zaghouan|zaghouan||TN|1vz|d1r|7sv4|26am|j63t8x
Zagreb|zagreb||HR|ln|fhi6|9te8|3fgg|j64mjf
Zahedan|zahedan||IR|1ks|cu3r|6bmg|d1d8|j64kut
Zahlé|zahle||LB|14s|1oap|796t|7p1e|j64del
Zakho|zakho||IQ|gm|2w27|7ylx|95dk|j64fwb
Zalaegerszeg|zalaegerszeg||HU|1w1|1bre|a1g8|3lxs|j63u57
Zalantun|zalantun||CN|16t|2yi8|aadc|qaww|j646nl
Zalău|zalau||RO|1hh|1csg|a406|4xye|j63upv
Zambezi|zambezi||ZM|18r|5gi|-2wh4|4ybf|j64jzj
Zamboanga|zamboanga|zamboanga city|PH|1w5|gkg8|1her|q5yl|j64lk1
Zamora|zamora||MX|13f|4lur|4a64|-lx74|j64cyj
Zamora|zamora||EC|1w7|bsc|-veg|-gxc4|j64e3b
Zanesville|zanesville||US|19y|uwk|8k6j|-hkth|j642t7
Zanjan|zanjan||IR|1w8|7ntr|7uy4|ae88|j6470z
Zanzibar|zanzibar|zanzibar city|TZ|1wa|8ngq|-1bj4|8egw|j64mh1
Zaozernyy|zaozernyy|zaozyorny|RU|w0|q4p|bzt0|kaqc|j645mb
Zaozhuang|zaozhuang||CN|1js|19z3c|7h5f|p75t|j64l7b
Zapala|zapala||AR|16x|es0|-8c5k|-f0mz|j64k2n
Zaporizhzhya|zaporizhzhya|zaporiyhzhya,zaporizhzhia|UA|1wb|gw0w|a9a8|7jet|j64j0p
Zarafshon|zarafshon|zarafshan|UZ|16k|1d13|8wum|drdu|j649rh
Zaragoza|zaragoza||ES|3z|dx30|8xdg|-6v8|j64kij
Zaranj|zaranj||AF|17o|12gr|6o28|d9iu|j63z6l
Zárate|zarate||AR|e4|1wi5|-7b1c|-cnk0|j64hdp
Zaraza|zaraza||VE|mj|w0b|202k|-e00g|j6499p
Zareh Sharan|zareh sharan|zarghun shar|AF|1bi|all|71h0|enwn|j63z7p
Zaria|zaria||NG|ry|j1yg|2dib|1nh5|j64khl
Zarzis|zarzis||TN|15f|3et5|76kg|2dnc|j649e3
Zaysan|zaysan||KZ|hw|dkw|a6bk|i6s6|j64g3j
Zelenodolsk|zelenodolsk||RU|1p0|24uo|byva|affa|j645kj
Zelenokumsk|zelenokumsk||RU|1mb|vve|9inv|9ekj|j64bvz
Zemio|zemio||CF|nn|ffk|12u9|5dxh|j64dth
Zemlya Bunge|zemlya bunge|bunge land|RU|1hd|a|g1x3|ughm|j645p5
Zenica|zenica||BA|1we|3ivb|9h7c|3u9s|j64887
Zeya|zeya||RU|2t|ktz|biqk|r9zu|j64jan
Zhaltyr|zhaltyr||KZ|3q|ja|b2ec|eyu0|j64g1x
Zhangaozen|zhangaozen|zhanaozen|KZ|11g|6v3|9a3w|bbeo|j64g7j
Zhangjiakou|zhangjiakou||CN|nu|mf3k|8r27|omsg|j64jkz
Zhangye|zhangye||CN|kc|4y14|8cdw|lj2s|j64lon
Zhangzhou|zhangzhou||CN|ju|23onf|5978|p7y4|j64dwj
Zhanibek|zhanibek|zhanybek|KZ|1uh|6c4|aldw|a1pg|j64g1f
Zhanjiang|zhanjiang||CN|m6|y2uo|4jlf|nnol|j64lph
Zhanyi|zhanyi||CN|1vt|dzjw|5hj9|m91z|j64esl
Zhaodong|zhaodong||CN|nw|3uvg|9vk4|r02g|j64f35
Zhaoqing|zhaoqing||CN|m6|aadc|4xuw|o3o4|j64dyd
Zhaotang|zhaotang|zhaotong|CN|1vt|hc88|5utj|m8al|j64jkl
Zharkent|zharkent||KZ|2e|s5s|9gr4|h54p|j64641
Zheleznogorsk|zheleznogorsk||RU|wd|23jg|b7z0|7l6k|j64c1d
Zheleznogorsk Ilimskiy|zheleznogorsk ilimskiy|zheleznogorsk ilimsky|RU|q6|lyg|c4jm|mbez|j64cmd
Zhengzhou|zhengzhou||CN|nx|1khy8|7g6p|od13|j64mxb
Zhenjiang|zhenjiang|zhenjiang jiangsu|CN|r3|iay8|6wmj|plih|j64jml
Zhetiqara|zhetiqara|zhitikara|KZ|1ew|102c|b6q2|d4j3|j64g0j
Zhezqazghan|zhezqazghan|jezkazgan,zhezkazgan|KZ|1er|28it|a8o8|eix0|j64js3
Zhigansk|zhigansk||RU|1hd|2hx|eb75|qfxr|j64lld
Zhijiang|zhijiang|zhijiang town|CN|p0|2fw3|5vqh|nia4|j64erl
Zhilinda|zhilinda||RU|1hd|a|f15l|ofmo|j64cqt
Zhob|zhob||PK|6c|1w6c|6pw2|evsi|j64bdh
Zholymbet|zholymbet||KZ|3q|5b0|b3b2|fdbf|j64g2b
Zhongli|zhongli|jhongli,jungli|TW|1ok|yzqg|5cmq|pzbc|j6489x
Zhongshan Station|zhongshan station|formerly sun yat sen station|AQ||1o|-evr9|gd1d|j64iux
Zhosaly|zhosaly||KZ|1fb|fhd|9qzh|dqfg|j646zv
Zhoukou|zhoukou||CN|nx|82xx|77hs|okho|j64eub
Zhuanghe|zhuanghe||CN|yg|5ls6|8i6v|qcs3|j64eux
Zhubei|zhubei|jhubei|TW|oq|4abk|5bm5|pxqf|j640x7
Zhucheng|zhucheng||CN|1js|mpwg|7pp8|pl55|j646l7
Zhuhai|zhuhai||CN|m6|lxco|4rwl|oca2|j64kkl
Zhuozhou|zhuozhou||CN|7k|dgkg|8h3d|otfw|j6469l
Zhuzhou|zhuzhou||CN|p0|n5c0|5yr3|o921|j64jjx
Zhytomyr|zhytomyr|zhytomyra|UA|1wh|61qo|arp4|655q|j64lcf
Zibo|zibo||CN|1js|1tlvs|7vyr|pav4|j64msx
Zicheng|zicheng|zhicheng|CN|ox|52wi|6hss|nwc8|j64eqp
Zielona Góra|zielona gora||PL|zu|2jdt|b4uo|3blk|j64df7
Zigong|zigong||CN|1k9|nomg|6av7|mgh1|j64erx
Ziguinchor|ziguinchor||SN|1wi|43xg|2p58|-3hp0|j64ka5
Žilina|zilina||SK|1xf|1vm1|ajs6|40o6|j64bc7
Zillah|zillah|zella|LY|1m|a|64ao|3roa|j64dch
Zima|zima||RU|q6|1ahb|bk5f|lvaj|j64j9d
Zinder|zinder||NE|1wj|4xqu|2yhc|1xbd|j64mbv
Ziniaré|ziniare||BF|1b3|9sv|2p1m|-9z6|j63zvl
Zixing|zixing||CN|p0|53u|5kdw|ob00|j646jx
Zlatoust|zlatoust||RU|d0|43nq|btqe|cs9g|j64kf1
Zlín|zlin||CZ|vy|2o5e|ajv4|3s6s|j64enl
Zmeinogorsk|zmeinogorsk||RU|2h|8vu|ayqb|hm7y|j64cfv
Zomba|zomba||MW|1wm|1qg4|-3ar0|7kgc|j64kpf
Zonguldak|zonguldak||TR|1wk|3d2u|8vog|6t7s|j64ajj
Zorgo|zorgo|zorgho|BF|kd|ifo|2mgu|-4pq|j63zy7
Zouar|zouar||TD|82|5o|4duz|3jj2|j64edx
Zouirat|zouirat|zouerat|MR|1pz|17h5|4ve0|-2obl|j64d3t
Zrenjanin|zrenjanin||RS|1m7|1df9|9q56|4dej|j647op
Zucchelli Station|zucchelli station|formerly terra nova bay|AQ||28|-fzrk|z74e|j64iu7
Zug|zug||CH|1wp|i2z|a41a|1thi|j63um7
Zumpango|zumpango||MX|15i|5cwg|48uw|-l8qk|j64d1x
Zunyi|zunyi||CN|mg|i73c|5xr0|mwzh|j64jgl
Zürich|zurich||CH|1ws|nqxs|a5ln|1tyh|j64muf
Züünkharaa|zuunkharaa|dzuunharaa|MN|1jd|ej2|ah22|mti2|j64jfp
Zuwara|zuwara|zuwarah|LY|2w|3v4m|724g|2l7b|j64lxf
Zvëzdnyj|zvezdnyj|zvezdnyy|RU|dw|a|f7i6|-12hq4|j645a7
Zvishavane|zvishavane||ZW|13h|rp4|-4cv4|6fv8|j64a53
Zvolen|zvolen||SK|6p|yc6|aevh|43ms|j64bc3
Zwedru|zwedru||LR|lt|jta|1au8|-1qqc|j64b7l
Zwolle|zwolle||NL|1bb|2e9p|b9a0|1b1m|j63vm7
Zyryanka|zyryanka||RU|1hd|2sr|e380|wc9w|j64jbp
Zyryanovsk|zyryanovsk|altai|KZ|hw|12be|anu5|i244|j64g3n`;

/** The bundled city gazetteer. Injected into `searchGazetteer(query, gazetteer, opts?)`. */
export const GAZETTEER: Gazetteer = decodeGazetteer({ source: 'nvkelso/natural-earth-vector@v5.1.2/geojson/ne_10m_populated_places.geojson' }, PACKED);
