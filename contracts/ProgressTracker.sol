// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProgressTracker
/// @notice Records a student's academic progress (courses, semesters, grades) on-chain,
///         separate from final issued credentials in CredentialRegistry.
/// @dev Follows the same authorized-institution pattern as CredentialRegistry.
contract ProgressTracker {

    address public owner;

    struct ProgressEntry {
        string courseName;     // e.g. "Data Structures and Algorithms"
        string semester;       // e.g. "Fall 2025"
        string grade;          // e.g. "A", "B+", "Pass"
        uint256 creditUnits;   // credit hours/units for this course
        address institution;   // wallet of the institution that recorded this entry
        uint256 recordedAt;    // block timestamp
    }

    // student wallet => list of progress entries
    mapping(address => ProgressEntry[]) private studentProgress;

    // institution wallet => is it allowed to record progress
    mapping(address => bool) public authorizedInstitutions;

    event InstitutionAuthorized(address indexed institution);
    event InstitutionRevoked(address indexed institution);
    event ProgressRecorded(
        address indexed student,
        address indexed institution,
        string courseName,
        string semester,
        string grade
    );
    event ProgressCorrected(address indexed student, uint256 indexed entryIndex, string newGrade);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyAuthorizedInstitution() {
        require(authorizedInstitutions[msg.sender], "Not an authorized institution");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Owner authorizes an institution's wallet to record student progress.
    function authorizeInstitution(address institution) external onlyOwner {
        require(institution != address(0), "Invalid address");
        authorizedInstitutions[institution] = true;
        emit InstitutionAuthorized(institution);
    }

    /// @notice Owner revokes an institution's ability to record progress.
    function revokeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = false;
        emit InstitutionRevoked(institution);
    }

    /// @notice Record a completed course/semester entry for a student.
    function recordProgress(
        address student,
        string calldata courseName,
        string calldata semester,
        string calldata grade,
        uint256 creditUnits
    ) external onlyAuthorizedInstitution {
        require(student != address(0), "Invalid student address");
        require(bytes(courseName).length > 0, "Course name required");

        studentProgress[student].push(ProgressEntry({
            courseName: courseName,
            semester: semester,
            grade: grade,
            creditUnits: creditUnits,
            institution: msg.sender,
            recordedAt: block.timestamp
        }));

        emit ProgressRecorded(student, msg.sender, courseName, semester, grade);
    }

    /// @notice Institution corrects a grade on an existing entry it recorded
    ///         (e.g. grade appeal outcome). Only the recording institution can correct it.
    function correctGrade(address student, uint256 entryIndex, string calldata newGrade) external {
        require(entryIndex < studentProgress[student].length, "Entry does not exist");
        ProgressEntry storage entry = studentProgress[student][entryIndex];
        require(entry.institution == msg.sender, "Only recording institution can correct");

        entry.grade = newGrade;
        emit ProgressCorrected(student, entryIndex, newGrade);
    }

    /// @notice Get all progress entries for a student — used by the student dashboard.
    function getProgress(address student) external view returns (ProgressEntry[] memory) {
        return studentProgress[student];
    }

    /// @notice Get the total number of credit units a student has completed so far.
    function getTotalCredits(address student) external view returns (uint256 total) {
        ProgressEntry[] storage entries = studentProgress[student];
        for (uint256 i = 0; i < entries.length; i++) {
            total += entries[i].creditUnits;
        }
    }

    /// @notice Get how many entries a student has — useful before fetching the full array.
    function getEntryCount(address student) external view returns (uint256) {
        return studentProgress[student].length;
    }
}
