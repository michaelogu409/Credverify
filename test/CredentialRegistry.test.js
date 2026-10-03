import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("CredentialRegistry", function () {
  let registry;
  let owner, institution, otherInstitution, student, stranger;

  beforeEach(async function () {
    [owner, institution, otherInstitution, student, stranger] = await ethers.getSigners();

    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    registry = await CredentialRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("sets the deployer as owner", async function () {
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("allows the owner to authorize an institution", async function () {
    await registry.authorizeInstitution(institution.address);
    expect(await registry.authorizedInstitutions(institution.address)).to.equal(true);
  });

  it("prevents a non-owner from authorizing an institution", async function () {
    await expect(
      registry.connect(stranger).authorizeInstitution(otherInstitution.address)
    ).to.be.revertedWith("Not contract owner");
  });

  it("prevents an unauthorized institution from issuing a credential", async function () {
    await expect(
      registry.connect(institution).issueCredential(
        student.address,
        "Degree",
        "BSc Computer Science",
        "hash123",
        "ipfsCID123"
      )
    ).to.be.revertedWith("Not an authorized institution");
  });

  it("lets an authorized institution issue a credential", async function () {
    await registry.authorizeInstitution(institution.address);

    const tx = await registry.connect(institution).issueCredential(
      student.address,
      "Degree",
      "BSc Computer Science",
      "hash123",
      "ipfsCID123"
    );
    const receipt = await tx.wait();

    // Grab the credentialId from the emitted event
    const event = receipt.logs
      .map((log) => {
        try {
          return registry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CredentialIssued");

    expect(event).to.not.be.undefined;
    const credentialId = event.args.credentialId;

    const result = await registry.verifyCredential(credentialId);
    expect(result.exists).to.equal(true);
    expect(result.valid).to.equal(true);
    expect(result.student).to.equal(student.address);
    expect(result.institution).to.equal(institution.address);
    expect(result.credentialType).to.equal("Degree");
    expect(result.programme).to.equal("BSc Computer Science");
    expect(result.documentHash).to.equal("hash123");
  });

  it("adds the credential to the student's list", async function () {
    await registry.authorizeInstitution(institution.address);
    await registry.connect(institution).issueCredential(
      student.address,
      "Degree",
      "BSc Computer Science",
      "hash123",
      "ipfsCID123"
    );

    const ids = await registry.getCredentialsOf(student.address);
    expect(ids.length).to.equal(1);
  });

  it("lets the issuing institution revoke a credential", async function () {
    await registry.authorizeInstitution(institution.address);
    const tx = await registry.connect(institution).issueCredential(
      student.address,
      "Degree",
      "BSc Computer Science",
      "hash123",
      "ipfsCID123"
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return registry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CredentialIssued");
    const credentialId = event.args.credentialId;

    await registry.connect(institution).revokeCredential(credentialId);

    const result = await registry.verifyCredential(credentialId);
    expect(result.exists).to.equal(true);
    expect(result.valid).to.equal(false); // revoked, so no longer valid
  });

  it("prevents a different institution from revoking someone else's credential", async function () {
    await registry.authorizeInstitution(institution.address);
    await registry.authorizeInstitution(otherInstitution.address);

    const tx = await registry.connect(institution).issueCredential(
      student.address,
      "Degree",
      "BSc Computer Science",
      "hash123",
      "ipfsCID123"
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return registry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CredentialIssued");
    const credentialId = event.args.credentialId;

    await expect(
      registry.connect(otherInstitution).revokeCredential(credentialId)
    ).to.be.revertedWith("Only issuing institution can revoke");
  });

  it("returns exists=false for a credential that was never issued", async function () {
    const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));
    const result = await registry.verifyCredential(fakeId);
    expect(result.exists).to.equal(false);
    expect(result.valid).to.equal(false);
  });
});
