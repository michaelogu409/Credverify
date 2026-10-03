import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ProgressTracker", function () {
  let tracker;
  let owner, institution, otherInstitution, student, stranger;

  beforeEach(async function () {
    [owner, institution, otherInstitution, student, stranger] = await ethers.getSigners();

    const ProgressTracker = await ethers.getContractFactory("ProgressTracker");
    tracker = await ProgressTracker.deploy();
    await tracker.waitForDeployment();
  });

  it("sets the deployer as owner", async function () {
    expect(await tracker.owner()).to.equal(owner.address);
  });

  it("prevents an unauthorized institution from recording progress", async function () {
    await expect(
      tracker.connect(institution).recordProgress(
        student.address,
        "Data Structures",
        "Fall 2025",
        "A",
        3
      )
    ).to.be.revertedWith("Not an authorized institution");
  });

  it("lets an authorized institution record progress", async function () {
    await tracker.authorizeInstitution(institution.address);

    await tracker.connect(institution).recordProgress(
      student.address,
      "Data Structures",
      "Fall 2025",
      "A",
      3
    );

    const entries = await tracker.getProgress(student.address);
    expect(entries.length).to.equal(1);
    expect(entries[0].courseName).to.equal("Data Structures");
    expect(entries[0].semester).to.equal("Fall 2025");
    expect(entries[0].grade).to.equal("A");
    expect(entries[0].creditUnits).to.equal(3);
    expect(entries[0].institution).to.equal(institution.address);
  });

  it("accumulates total credits across multiple entries", async function () {
    await tracker.authorizeInstitution(institution.address);

    await tracker.connect(institution).recordProgress(student.address, "Course A", "Fall 2025", "A", 3);
    await tracker.connect(institution).recordProgress(student.address, "Course B", "Fall 2025", "B", 4);

    const total = await tracker.getTotalCredits(student.address);
    expect(total).to.equal(7);
  });

  it("reports the correct entry count", async function () {
    await tracker.authorizeInstitution(institution.address);
    await tracker.connect(institution).recordProgress(student.address, "Course A", "Fall 2025", "A", 3);

    expect(await tracker.getEntryCount(student.address)).to.equal(1);
  });

  it("lets the recording institution correct a grade", async function () {
    await tracker.authorizeInstitution(institution.address);
    await tracker.connect(institution).recordProgress(student.address, "Course A", "Fall 2025", "B", 3);

    await tracker.connect(institution).correctGrade(student.address, 0, "A");

    const entries = await tracker.getProgress(student.address);
    expect(entries[0].grade).to.equal("A");
  });

  it("prevents a different institution from correcting someone else's entry", async function () {
    await tracker.authorizeInstitution(institution.address);
    await tracker.authorizeInstitution(otherInstitution.address);

    await tracker.connect(institution).recordProgress(student.address, "Course A", "Fall 2025", "B", 3);

    await expect(
      tracker.connect(otherInstitution).correctGrade(student.address, 0, "A")
    ).to.be.revertedWith("Only recording institution can correct");
  });

  it("reverts when correcting a grade on a non-existent entry", async function () {
    await tracker.authorizeInstitution(institution.address);
    await expect(
      tracker.connect(institution).correctGrade(student.address, 0, "A")
    ).to.be.revertedWith("Entry does not exist");
  });

  it("returns an empty array and zero credits for a student with no entries", async function () {
    const entries = await tracker.getProgress(stranger.address);
    expect(entries.length).to.equal(0);
    expect(await tracker.getTotalCredits(stranger.address)).to.equal(0);
  });
});
