History over changes

* V. 1.72
- added a new particle system, visuel better and can use png's
- new city stats added, some old one removed and other replaced
- regions now have a 10 level corruption system
- city UI changed to show these new stats
- hover system added to the new stats with more detail
- questlog show both completed and active quest
- new building: Armory - use to convert items (weapon and armor) to weaponPoint and armorPoints to be uses at payment for units

* V 1.71
- added new quest and quest types (npc can now have startNpcIds and turnInNpcIds)
- changed a bit i particle system (leaves works on tree now also, not just as weather)
- added new mobs (Spawn of Hydra, Hellhound, Gigant Troll, Mountain Troll, Shadwo Dragon, Infernus Minions, Spawn of Archnogrim, Flesheater) 
- save system made more ready for server version - will still be driven by LocalStorage for now
- worldState introduced (many things is flagged)
- condition system introduced (using worldstate). If nothing is change system use old system and all is fine in old entries
- conditon system only om map-region config for now.


* V. 1.70
- removed old legacy biodome use (a fragment is still there to make system works with old saves, but it's less used)
- changed prefabs to use new decay system instead of lagacy
- made a better popup for city mobs attack (more prety, but can still use more work)
- fix a error when buying unit took some resouce, stop when missing resource, so player didn't get used resource back and no units!
- added book layout on readable lores
- change demands chips layout and appearence
- repair list now shows if item is equept or i back pack
- city menu bottom now have texture picture (background)

* V. 1.63
- added a new back pack/charater sheet - more graphic
- changed default back pack slot count from 30 to 42
- added settings for auto pickup (combine type of item with rarity)
- repairlist i blacksmith will now show both equipt and items in back pack and have symbol for each
- made a menu city mode menu at bottom instead of same quick iron menu as in battle maps

* V. 1.62
- added wolf_cub og wolf_fenris (last as boss)
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

* V. 1.61
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

* V. 1.60
- total new city map look
- area are introduced i city
- city stats is introduced (population, provision, water, housing, health, city defence aso ...)
- More mobs added (a bunch of angry villages)
- city areas and buildings have now durability
- items now have durability (won't save still)
- app.jsx was a big 6000+ lines files, it has been split to more managed files

* V. 1.50
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

* V. 1.40
* removed hero movement fra city mode - using mouse clikc instead
* change a lot behind the scenes (rearranged files)
* added boss system, socket system and many function to houses

* V. 1.31
* changed quest system (added quest demands)
* NPC are now permanent placed in city
* NPC can give more quest at a time
* NPC data is moved to seperate NPC config file
* added Readable items to game (spellbook, skillbook, notes and fragment for all - is all really one system)
* removed most of old biodome and object system
* changed label color on open region on map
* added visualization to quests

* V. 1.30
* change a bit in map layout
* locked all regions off and make my way by making quest as I'm unlocking it
* introduced new foilage, object, decay, tileset, mapSize options on region setting (old one is still in effect but are legazy forward on)
* introduced more options to antiDrop in region settings
* added more new graphic (foilage, tileset, decay, object)
* added more mobs based on spider mob (MiniSpider, MediumSpider and LargeSpider)

* V. 1.20
* added NPC and quest
* added new icon in bottom menu
* added big map and character view modals
* added counter for almost everything to show in character view
* added more quest
* change items and resource system a bit (for easy input)
* introduced world map and region maps
* region is the main source for controlling mobs, biodome and loot lock
* world map and region can be locked (region maybe still can't)

* V. 1.10
* added more foilage for each biodome
* added resources to collect
* changed stone and crystal as destructable objects
* mobs hp bar is left orienteted (instead of center)
* more generel settings is moved to config files
* stats popularity is introduced
* houses can be destoryed and can drop anything, but cost on popularity
* statusbar shows how many of one items picked up (stacked items)
* added hero picture at stats bars
* added city map with 9 buildings (function will be added later)

* V. 1.00
* first working edition



