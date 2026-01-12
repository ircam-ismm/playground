const archivesManager = {
  init(globalState) {
    this.globalState = globalState;
  },

  updateFromFileTree(tree) {
    console.log(tree);
  },

  archive(name) {

  },

  restore(name) {
    // check name exists
    // unzip in project directory
  },
}

export default archivesManager;
