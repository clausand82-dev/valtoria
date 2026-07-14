History over changes

*V. 1.13
- run some code and performance optimizing
- added reset to music/sound settings
- added a mute shotcut
- added access to settings in expedition mode
- added option to go back to start screen from city mode
- moved city menu to be centered around city map instead of screen
- moved help icon into menu
- esc will now close open modals instead of open map
- added sounds for monsters (villagers, boars and rats) - attack, aggro, hurt and death
- added a editor for blueprint and prefab design - supplement for the two old systems

*V. 1.12
- fixed an error where hay wasn't destructable - only meant to been diabled when villager_help_collect_hay was active
- added export/import to start menu (can be used to transfer save game between browser/pc)
- fixed some hardcoded danish words to be english and moved danish to lang system
- futher optimized performence log system to report more details
- changed stack size on some resources (from 100 to 1000)
- fixed a bug where 1000 stack resourcer changed to 100 stack size in city inventory
- fixed a bug where item reward was not rewarded in some hunters quest - NEED TEST
- added sfx and music support
- added sfx sounds and music (some UI sounds added, wolf, spider, demon and skeleton have sounds)
- settings is now avaiable in start menu also

*V. 1.11
- fixed an bug where questreward crashed game

*V. 1.10
- added summary modal after expedition run
- added game version number i right bottom corner in velcome screen
- both lydra and nedra now have floating text showinbg amount in expedition runs
- low threat also now reduce spread from city mobs already there
- blacksmith can no longer destroy equipt items
- city mobs and npc chips are smaller (npc 26% smaller, city mobs 21% smaller)
- custom text can now show IMPORTENT msg's on frontpage
- split loading screen, start menu, and HUD CSS into feature-owned stylesheets without changing the UI
- moved the isolated bestiary CSS block into its own feature stylesheet
- moved the HUD performance/debug panel styles into the existing HUD stylesheet
- moved shared quest-dialog and hero-dialog styles into feature-owned stylesheets
- moved map-dialog, world-energy, quickslot, and skillbar styles into feature-owned stylesheets
- moved purely city-scoped UI styles into a dedicated city stylesheet
- restored the compact bottom wilderness interaction prompt after the CSS split
- restored HUD action-bar and region-debug selectors after removing stray CSS patch markers
- expanded spell quickslots to keys 3-6; number keys now select spells while mouse input casts the active spell
- changed a bit i questlines
- added a new questline (rebuild city defence)
- fixed a small bug where city questlog didn't counted city storage items and resources into questlog

*V. 1.01
- some small ui translation fixes
- yellow ? when quest is ready to turn in, will now always be show instead of gray ! or ?
- edited city-inn-taproom
- added foilage_glass and foilage_bottles
- added 10 new lorebooks and notes
- lore hover now use selected lang
- resource chips now use translated names
- added alots of new quest
- non repair able items will disapper when reaching 0 in durability
- price on sell in mechant is now more clear
- when only have one of an item, select how many to sell modal, is skipped
- made some changes to item durability to balance durability out (it was way to hard)
- bad event are still red, but good events are now green
- changed a bit in statistic view
- board and inn quest now use completed maps as countdowns (completed map is a map where all mobs are killed - city mobs mattack map dosn't count)
- added 32 new named items (STILL NEED TO DO PIC FOR LAST 16)
- added more item name prefixes (for bigger variation on random generated items in drops)
- added temporary city-mob burials that grant Lydra without saving grave markers (new runtime-only options on action).
- fixed some action loot and bury errors
- added navigation on long lore books
- lore books now use selected lang
- shadowdragon should not be invisiable no more
- fixed bug in scarecrow quest

*V. 1.00
- added artifact/monuments, archivments and policy rules (all can improve city stats)
- added configuredLoot (for more special case for loot)
- new loottable system (more simple when adjusted)
- monster config file optimized
- mana potion can now be donated for defence
- health potion can now be donated for health
- extra spellbook, notes and lore books can now be recycled to paper
- paper can craft scrolls
- added two new city mobs and made some big balance and feature change in city mob system
- changed citystats behaivor a lot
- added exclusiveWith function to policy
- magic slot i charater sheet now shows magic info in hover
- active magic can now be selected instead of a cycle
- added icons to magic slot
- city mobs can now occupied buildings if city wall is down or not yet build (and are visuel showned at area and building)
- city areas, building and addons can now be build fra complete quest
- some city areas shall now be cleared before player can build lvl 1 and get access to build buildings.
- fixed an error in check_inn_infestation quest, where when entered crack and back again before crack cleared, crack coun't be revisited
- added color frames to quest list
- added new condition (eliteSpawns) witch can be use to blocked elites in special cases (region based)
- at NPC questlist will only be showed if there is a list, otherwise quest vil come straight up
- adjusted some startup quests
- removed quest finish modal
- changed how toastlog counter works - it now only count importent messenges
- toast log counter resets when log have been opened
- added more info on about region maps on region map (corruption, active mobs, map size and region active quests)
- fixed so quest show material from bank also and can use both inventory and city inventory
- when pickup ud quest relevant items a special floating text will show it
- city mobs are now more easy to see om city map
- inn and bank occupied by city mobs can't use main chest and vault
- tileset can transform into real isometrisk tile instead of just beeing a diamond mask
- decay also use real isometrisk transformation now (when projection: "topdown" is set in decay config)
- added some new object, foilage and decay sheets
- startet to do some wall code, but deactivated for now as it's not finish
- building you will get by quest can't be bought (bank, mechant, sanctury and blacksmith)
- items can now get destroyWhenDurabilityDepleted - when set to true item will disaperar when reaching 0% durability
- complete (99%) translation done - denglish and danish is now supported - changed lang in city settings
- added helping system

*V. 0.84
- fixed ale brewing didn't cost and give citystat water
- added a City Tonic Lab where different city tonic can be made - city tonic adds different city stats
- new player lightning spell (do damage and do stun); lightning spell is first channeled spell type
- fixed hero animation sheet (now use one instead of two files)
- added new story line quest (elis_stolen_fruit_barrel and find poor girls father quest line)
- new quest opens new regions (marketplace, the well and the forest)
- more optimizing
- adjusted building and area prices

*V. 0.83
- adding picture for addons/features

*V. 0.82
- adding more city stats and consequences
- added icons for buffs (also consequences)
- added alchemy_bench addon in research lab
- added function where pay to something in city can draw from own inventory and city inventory
- added support for stacking quiestitems
- enabled drinking potion direct from backpack
- fixed a durability bug

*V. 0.81
- Blacksmith Forge Addon can now destroy gear and not only items now
- fixed a bug where chunk generation not was so random after all (tileset, object, deacy, foliage, mobs and world generation)
- change building system: all features are now "addons"
- item hover is now stacked vertical instead of horizental
- items-config can now take conditions (and shorthanded too) at parent level
- added metalchest object (normal, damage and destroyed)
- added more foilage and objects
- now there are small, medium and big health and mana
- fixed crack02.png
- potion mege system integrated
- new toast log system


*V. 0.80
- added two quest for village area (kill villager and repair houses)
- added small system to handle count of object when making map for region
- changed quest text to be taken from config instead of save (this way text can be updated)
- added graphic for outer fields lvl 1 to 3. Data still needs adjustment.
- added sorting to backpacks
- changed inn's chest to 50 slots, up from 10

*V. 0.79
- added species and tags to mobs
- added drag and drop from slot to inventory - double click will do the same
- fixed that some items used default.png i city inventory but normal png i own inventory
- potions can now also stack in city inventory
- change info panel in inventory to a hover instead
- new hover can show both current item and equipt item
- item name in hover now use rarity color instead of the golden one for all
- stats in info hover now take durability into account
- object hay01 and hay02 is now just hay, but use hay from both sheets
- all items everywhere in city now use new item hover

*V. 0.78
- deactivated greenscreen and greenspill processing as all sheets now have alpha
- added a decay iso para (not using it for now)
- added a critter system
- changed area/building durability loos chance from 40% to 10%
- added individuel baseCost and minCost to foodbarrel convertion
- added res orange and banana (for quest and food barrel)
- added ale and use for goldignot, foodbarrel and ale to game
- added setting and cheat shotcuts when cheat is enabled
- added fractions, species and tags and a system to use them
- fraction, species and tags can work as conditions
- fixed a lot of small bugs
- added support for view of more rewards

*V. 0.77
- changed end chest to be a object with E action and removed animated chest
- cleaned up npc's and added more
- changed quest to come from town hall (grind quest), inn (rumour) and npc's (story)
- changed action bar to be more usefull (more will come)
- fixed an erro where default box icon would show in mage tower
- added rareMobs option to regions
- added option to do questchains (steps system)
- added a Bestiary system
- added a "cheat" system and some commands to make testing easy (have a global turn on/off)
- esc now close and open map
- map now lands in last region opened or wolrd map
- change UI on building modal
- fixed classes point error
- fixed a bug whre prebuilt building would stay prebuilt after prebuilt sat to false
- slowly started to convert/used 2048x2048, 1024x1024 sheets instead of 1254x1254

*V. 0.76
- added sublevel system - building on top of action system form early
- npc can now be placed in prefabs, regions and subregions
- added standard loot table in object drops

*V. 0.75
- added a particle system to object where pixel points can have speciel particles attatched
- reduced DPR and set dps to lower than max before (got form 84 degress to 64)
- blizzard ground effect added a faded/blurred border instead of harsh one
- fixed ustabile spellbook icon use - now it don't use fallback when icon is there
- added action system (E prompt on objects) - subregion and npc will come to
- fixed a transfer all resourcer at bank - it would also transfer items on second try - now fixed
- reduced GPU heat problem even more

*V. 0.74
- Netdra og Lydra system tilføjet
- fixed particle error where some blue dots remained after Blizzard was completed
- added worldState og worldEnergy til map-abandon-reset-config
- more old greenscreen pictures cleaned up
- added more mobs (icebear, bear, lion, sickrat, rat) - need animation tweak

* V. 0.73
- added options to have 1x1 or 2x2 object sheets
- added options to have more than one sheets on a object
- added player occulision fade options
- added tag and aviodtags to better use of big objects
- shorthanded condition is implemented (makes it easy to make condition)
- added NEW spell blizzard
- added new player stats like resist and more magic 
- added new player slot called offhand for shield, orb and så on
- added new player class system
- 

*V. 0.72
- added a new particle system, visuel better and can use png's
- new city stats added, some old one removed and other replaced
- regions now have a 10 level corruption system
- city UI changed to show these new stats
- hover system added to the new stats with more detail
- questlog show both completed and active quest
- new building: Armory - use to convert items (weapon and armor) to weaponPoint and armorPoints to be uses at payment for units
- added durability visual effect to city (smoke, flames and ruin pictures of buildings)

*V. 0.71
- added new quest and quest types (npc can now have startNpcIds and turnInNpcIds)
- changed a bit i particle system (leaves works on tree now also, not just as weather)
- added new mobs (Spawn of Hydra, Hellhound, Gigant Troll, Mountain Troll, Shadwo Dragon, Infernus Minions, Spawn of Archnogrim, Flesheater)
- save system made more ready for server version - will still be driven by LocalStorage for now
- worldState introduced (many things is flagged)
- condition system introduced (using worldstate). If nothing is change system use old system and all is fine in old entries
- conditon system only om map-region config for now.
- opdated shadows (same, but more blurred so more realistic)


*V. 0.70
- removed old legacy biodome use (a fragment is still there to make system works with old saves, but it's less used)
- changed prefabs to use new decay system instead of lagacy
- made a better popup for city mobs attack (more prety, but can still use more work)
- fix a error when buying unit took some resouce, stop when missing resource, so player didn't get used resource back and no units!
- added book layout on readable lores
- change demands chips layout and appearence
- repair list now shows if item is equept or i back pack
- city menu bottom now have texture picture (background)

*V. 0.63
- added a new back pack/charater sheet - more graphic
- changed default back pack slot count from 30 to 42
- added settings for auto pickup (combine type of item with rarity)
- repairlist i blacksmith will now show both equipt and items in back pack and have symbol for each
- made a menu city mode menu at bottom instead of same quick iron menu as in battle maps

*V. 0.62
- added wolf\_cub og wolf\_fenris (last as boss)
- moved food barrel recipes from code to config file
- loading battle maps now only loads nessacery assets and base core, next map will load not allready nessecary assets
- fog of war added
- ambient particle system added
- object, foilage with more particle system added
- weather including thunderstorm added
- better debth handling on battle map
- fixed food barrel not going in inventory when bought
- did a tranfer all resource button in bank
- added magic damage to weapons
- a small prefeb system is implemented, is a light version and can be more advandced later

*V. 0.61
- app.jsx is reduced more
- shared.jsx is split into smaller files and deleted
- fixed bank stacking
- fixed missing durability in ssaves - now lost durability stays
- durability bar now always shows
- world map is part of city instead of battle map
- a config files now defines punishment for leaving battle map early
- changed layout in sidepanel
- use of resources now draw from every inventory slot (back pack first)
- redesigned army system (now you buy different army unit to use defending city)

*V. 0.60
- total new city map look
- area are introduced i city
- city stats is introduced (population, provision, water, housing, health, city defence aso ...)
- More mobs added (a bunch of angry villages)
- city areas and buildings have now durability
- items now have durability (won't save still)
- app.jsx was a big 6000+ lines files, it has been split to more managed files

*V. 0.50
- added armor slot for belt, cape, relic and shoulders
- loottable added for new items
- added lord kealand unique items
- added lady lirine unique items
- unique drop chances can be guidet via weight
- unique and named items can use all stats
- added more quest, resources and items
- added more quest flexibility
- opened up village zone - a large map
- foilage can now have fixed scale
- added more foilage sets

*V. 0.40
- removed hero movement fra city mode - using mouse clikc instead
- change a lot behind the scenes (rearranged files)
- added boss system, socket system and many function to houses

*V. 0.31
- changed quest system (added quest demands)
- NPC are now permanent placed in city
- NPC can give more quest at a time
- NPC data is moved to seperate NPC config file
- added Readable items to game (spellbook, skillbook, notes and fragment for all - is all really one system)
- removed most of old biodome and object system
- changed label color on open region on map
- added visualization to quests

*V. 0.30
- change a bit in map layout
- locked all regions off and make my way by making quest as I'm unlocking it
- introduced new foilage, object, decay, tileset, mapSize options on region setting (old one is still in effect but are legazy forward on)
- introduced more options to antiDrop in region settings
- added more new graphic (foilage, tileset, decay, object)
- added more mobs based on spider mob (MiniSpider, MediumSpider and LargeSpider)

*V. 0.20
- added NPC and quest
- added new icon in bottom menu
- added big map and character view modals
- added counter for almost everything to show in character view
- added more quest
- change items and resource system a bit (for easy input)
- introduced world map and region maps
- region is the main source for controlling mobs, biodome and loot lock
- world map and region can be locked (region maybe still can't)

*V. 0.10
- added more foilage for each biodome
- added resources to collect
- changed stone and crystal as destructable objects
- mobs hp bar is left orienteted (instead of center)
- more generel settings is moved to config files
- stats popularity is introduced
- houses can be destoryed and can drop anything, but cost on popularity
- statusbar shows how many of one items picked up (stacked items)
- added hero picture at stats bars
- added city map with 9 buildings (function will be added later)

*V. 0.01
- first working edition
