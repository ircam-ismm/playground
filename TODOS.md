- [x] trigger controller overflow
- [x] filter out roles in header
- [ ] trigger all button stays on top
- [ ] soudbank go to new line
- [?] controls z-index
- [ ] threshold for trigger all

# Notes upgrade

- [ ] release @soundworks/helpers
- [x] release @soundworks/plugin-position

- [ ] project is now defined in env file or in process.ENV.
      - must be a path to a folder

# TODOS

- [x] externalize projects
- [x] put project path in env config rather than app config, override with `process.env.PROJECT`
- [x] thing clients should load files from networks
- [x] soloist rotate map

# Issues / Questions

- @soundworks/plugin-position
  + encode given image as base64, so we don't have to bother with exposing it through HTTP
  + randomize clients configuration from server-side
  + define a map [hostname, infos] for node clients, should be able to contain some related payload

- @soundworks/helpers
  + override default appName / appAuthor
