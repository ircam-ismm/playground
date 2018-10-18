# TODO

## Documentation

- map of the network to show the relationship between the server and clients 
- 

## Bug Fixes

- loading problems - ok (hopefully)

## New Developments

- creating groups of clients by creating arbitrary bounding boxes in soloist
- sending a specific sample to a group

- OSC messages
  + controlling the center point of soloist
  + sending a specific sample to a group  
  + triggereing sound on a specific group

- we discussed implementing the granulation engine and there are a few other things I would like to discuss and some bugs and refinements I would like to discuss. Also I am interested in working on OSC control of the functions we are building so some of them could be automated with the HOA score.  This would open up the multi-layering of sounds on the phones as it is clear that each loaded sound has its own thread and so can remain looping while new sounds are loaded etc, so layering textures would become more available if some of the sounds could be triggered and loaded external to the HTML interface. I want to generate some vocal hocketting across the audience from  recorded vocal material so some long grains or event a kind of interpolated random looping function could be useful for that.  in this respect it would be great to record and later spatialisation patters which would allow for rhythmic movements across the audience - these too could be live in the soloist interface and also possibly driven by OSC. 
