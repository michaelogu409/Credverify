import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("AccessControl", function () {
  let access;
  let admin, institution, verifier, stranger;

  beforeEach(async function () {
    [admin, institution, verifier, stranger] = await ethers.getSigners();

    const AccessControl = await ethers.getContractFactory("AccessControl");
    access = await AccessControl.deploy();
    await access.waitForDeployment();
  });

  it("makes the deployer an admin", async function () {
    expect(await access.isAdmin(admin.address)).to.equal(true);
  });

  it("lets an admin register an institution", async function () {
    await access.registerInstitution(institution.address);
    expect(await access.isInstitution(institution.address)).to.equal(true);
  });

  it("lets an admin register a verifier", async function () {
    await access.registerVerifier(verifier.address);
    expect(await access.isVerifier(verifier.address)).to.equal(true);
  });

  it("prevents a non-admin from registering an institution", async function () {
    await expect(
      access.connect(stranger).registerInstitution(institution.address)
    ).to.be.revertedWith("Caller is not an admin");
  });

  it("lets an admin remove an institution", async function () {
    await access.registerInstitution(institution.address);
    await access.removeInstitution(institution.address);
    expect(await access.isInstitution(institution.address)).to.equal(false);
  });

  it("lets an admin remove a verifier", async function () {
    await access.registerVerifier(verifier.address);
    await access.removeVerifier(verifier.address);
    expect(await access.isVerifier(verifier.address)).to.equal(false);
  });

  it("reverts when removing an institution that was never registered", async function () {
    await expect(
      access.removeInstitution(stranger.address)
    ).to.be.revertedWith("Not currently an institution");
  });

  it("lets an admin promote another account to admin", async function () {
    await access.addAdmin(stranger.address);
    expect(await access.isAdmin(stranger.address)).to.equal(true);
  });

  it("lets a newly promoted admin also register institutions", async function () {
    await access.addAdmin(stranger.address);
    await access.connect(stranger).registerInstitution(institution.address);
    expect(await access.isInstitution(institution.address)).to.equal(true);
  });

  it("supports generic grantRole/revokeRole for the INSTITUTION_ROLE", async function () {
    const role = await access.INSTITUTION_ROLE();
    await access.grantRole(role, institution.address);
    expect(await access.hasRole(role, institution.address)).to.equal(true);

    await access.revokeRole(role, institution.address);
    expect(await access.hasRole(role, institution.address)).to.equal(false);
  });
});
