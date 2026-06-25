History over changes

TO DO:
kun en farm, resten er bare areas der hedder farm!

*V. 0.90
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

* V. 0.72
- added a new particle system, visuel better and can use png's
- new city stats added, some old one removed and other replaced
- regions now have a 10 level corruption system
- city UI changed to show these new stats
- hover system added to the new stats with more detail
- questlog show both completed and active quest
- new building: Armory - use to convert items (weapon and armor) to weaponPoint and armorPoints to be uses at payment for units
- added durability visual effect to city (smoke, flames and ruin pictures of buildings)

- V 0.71
- added new quest and quest types (npc can now have startNpcIds and turnInNpcIds)
- changed a bit i particle system (leaves works on tree now also, not just as weather)
- added new mobs (Spawn of Hydra, Hellhound, Gigant Troll, Mountain Troll, Shadwo Dragon, Infernus Minions, Spawn of Archnogrim, Flesheater)
- save system made more ready for server version - will still be driven by LocalStorage for now
- worldState introduced (many things is flagged)
- condition system introduced (using worldstate). If nothing is change system use old system and all is fine in old entries
- conditon system only om map-region config for now.
- opdated shadows (same, but more blurred so more realistic)


* V. 0.70
- removed old legacy biodome use (a fragment is still there to make system works with old saves, but it's less used)
- changed prefabs to use new decay system instead of lagacy
- made a better popup for city mobs attack (more prety, but can still use more work)
- fix a error when buying unit took some resouce, stop when missing resource, so player didn't get used resource back and no units!
- added book layout on readable lores
- change demands chips layout and appearence
- repair list now shows if item is equept or i back pack
- city menu bottom now have texture picture (background)

* V. 0.63
- added a new back pack/charater sheet - more graphic
- changed default back pack slot count from 30 to 42
- added settings for auto pickup (combine type of item with rarity)
- repairlist i blacksmith will now show both equipt and items in back pack and have symbol for each
- made a menu city mode menu at bottom instead of same quick iron menu as in battle maps

* V. 0.62
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

* V. 0.61
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

* V. 0.60
- total new city map look
- area are introduced i city
- city stats is introduced (population, provision, water, housing, health, city defence aso ...)
- More mobs added (a bunch of angry villages)
- city areas and buildings have now durability
- items now have durability (won't save still)
- app.jsx was a big 6000+ lines files, it has been split to more managed files

* V. 0.50
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

* V. 0.40
- removed hero movement fra city mode - using mouse clikc instead
- change a lot behind the scenes (rearranged files)
- added boss system, socket system and many function to houses

* V. 0.31
- changed quest system (added quest demands)
- NPC are now permanent placed in city
- NPC can give more quest at a time
- NPC data is moved to seperate NPC config file
- added Readable items to game (spellbook, skillbook, notes and fragment for all - is all really one system)
- removed most of old biodome and object system
- changed label color on open region on map
- added visualization to quests

* V. 0.30
- change a bit in map layout
- locked all regions off and make my way by making quest as I'm unlocking it
- introduced new foilage, object, decay, tileset, mapSize options on region setting (old one is still in effect but are legazy forward on)
- introduced more options to antiDrop in region settings
- added more new graphic (foilage, tileset, decay, object)
- added more mobs based on spider mob (MiniSpider, MediumSpider and LargeSpider)

* V. 0.20
- added NPC and quest
- added new icon in bottom menu
- added big map and character view modals
- added counter for almost everything to show in character view
- added more quest
- change items and resource system a bit (for easy input)
- introduced world map and region maps
- region is the main source for controlling mobs, biodome and loot lock
- world map and region can be locked (region maybe still can't)

* V. 0.10
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

* V. 0.01
- first working edition

