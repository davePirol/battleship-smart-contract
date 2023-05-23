const Adoption = artifacts.require("Game");

contract("Game", (accounts) => {
  let battleship;
  let expectGameId;

  before(async () => {
    battleship = await Adoption.deployed();
  });

  describe("create a new game", async () => {
    before("create a new game from accounts[0]", async () => {
        let x = await battleship.join(0, true, [1,2], { from: accounts[0] });
        expectGameId = x;
    });
  });

  it("A new game is being created: ", async () => {
    let id="044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116d";
    assert.equal(id, expectGameId, "The id of game is: ");
  });
});