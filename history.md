History over changes

* V. 1.60
* total new city map look
* area are introduced i city
* city stats is introduced (population, provision, water, housing, health, city defence aso ...)
* More mobs added (a bunch of angry villages)
* city areas and buildings have now durability





* V. 1.50
* added armor slot for belt, cape, relic and shoulders
* loottable added for new items
* added lord kealand unique items
* added lady lirine unique items
* unique drop chances can be guidet via weight
* unique and named items can use all stats
* added more quest, resources and items
* added more quest flexibility
* opened up village zone - a large map
* foilage can now have fixed scale
* added more foilage sets
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



Min GameEngine.js er gigantisk (4000+ linjer) og det er alt alt for meget - jeg vil gerne have den delt op i mindre bider - jeg tænker funktions bestemt (alle funktioner der handler om quest i en fil, alle city funktioner i en anden fil osv). Måske få alle de her mindre filer ind i en GameEngine under bibliotek.

Jeg vil også gerne have alle hardcodet generelle indstillinger fra gameengine over i config filer istedet. Medmindre nogle indstillinger passer ind i eksisterende config filer, så tænekr jeg det er okay at samle disse indstillinger i en config fil, hvor det bare bliver inddelt i kategorier istedet.

