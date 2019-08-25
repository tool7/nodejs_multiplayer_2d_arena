module.exports = {
  _io: null,

  init (io) {
    this._io = io;
  },

  get io () {
    return this._io;
  }
};
