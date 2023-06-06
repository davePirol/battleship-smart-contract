const Adoption = artifacts.require("Game");

contract("Game", (accounts) => {
  let battleship;
  let expectGameId;

  before(async () => {
    battleship = await Adoption.deployed();
  });

  describe("check merkle proof", async () => {
    before("send merkle proof from accounts[1]", async () => {
        let x = await battleship.checkMerkleProof.call("0xc65a7bb8d6351c1cf70c95a316cc6a92839c986682d98bc35f958f4883f9d2a8",["a", "b", "c"], true)
        expectGameId = x;
    });
  });

  it("Check merkle proof: ", async () => {
    let id="044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116d";
    assert.equal(id, expectGameId, "The id of game is: ");
  });
});

function numStringToBytes32(num) { 
  var bn = new BN(num).toTwos(256);
  return padToBytes32(bn.toString(16));
}

function bytes32ToNumString(bytes32str) {
  bytes32str = bytes32str.replace(/^0x/, '');
  var bn = new BN(bytes32str, 16).fromTwos(256);
  return bn.toString();
}

function padToBytes32(n) {
  while (n.length < 64) {
      n = "0" + n;
  }
  return "0x" + n;
}