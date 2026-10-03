// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CredentialRegistry
/// @notice Stores and verifies academic credentials issued by authorized institutions.
/// @dev No personal data is stored on-chain — only a hash of the credential document
///      (e.g. SHA-256 of the PDF/transcript) plus minimal metadata for lookup.
contract CredentialRegistry {

    address public owner;

    struct Credential {
        address student;         // wallet address of the credential owner
        address institution;     // wallet address of the issuing institution
        string credentialType;   // e.g. "Degree", "Diploma", "Certificate", "Transcript"
        string programme;        // e.g. "BSc Computer Science"
        string documentHash;     // SHA-256 hash of the actual document (computed off-chain)
        string ipfsCID;          // optional: IPFS pointer to the encrypted/stored document
        uint256 issuedAt;        // block timestamp of issuance
        bool revoked;            // true if the institution has revoked this credential
    }

    // credentialId => Credential
    mapping(bytes32 => Credential) private credentials;

    // student wallet => list of credential IDs they hold
    mapping(address => bytes32[]) private studentCredentials;

    // institution wallet => is it allowed to issue credentials
    mapping(address => bool) public authorizedInstitutions;

    event InstitutionAuthorized(address indexed institution);
    event InstitutionRevoked(address indexed institution);
    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed student,
        address indexed institution,
        string credentialType
    );
    event CredentialRevoked(bytes32 indexed credentialId, address indexed institution);

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

    /// @notice Owner authorizes an institution's wallet to issue credentials.
    function authorizeInstitution(address institution) external onlyOwner {
        require(institution != address(0), "Invalid address");
        authorizedInstitutions[institution] = true;
        emit InstitutionAuthorized(institution);
    }

    /// @notice Owner revokes an institution's ability to issue credentials.
    function revokeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = false;
        emit InstitutionRevoked(institution);
    }

    /// @notice Issue a new credential to a student's wallet.
    /// @param student Wallet address of the receiving student.
    /// @param credentialType e.g. "Degree", "Diploma", "Certificate", "Transcript".
    /// @param programme e.g. "BSc Computer Science".
    /// @param documentHash SHA-256 hash of the credential document, computed off-chain.
    /// @param ipfsCID Optional IPFS content ID where the document is stored.
    /// @return credentialId The unique ID assigned to this credential.
    function issueCredential(
        address student,
        string calldata credentialType,
        string calldata programme,
        string calldata documentHash,
        string calldata ipfsCID
    ) external onlyAuthorizedInstitution returns (bytes32 credentialId) {
        require(student != address(0), "Invalid student address");
        require(bytes(documentHash).length > 0, "Document hash required");

        credentialId = keccak256(
            abi.encodePacked(student, msg.sender, documentHash, block.timestamp)
        );

        require(credentials[credentialId].issuedAt == 0, "Credential already exists");

        credentials[credentialId] = Credential({
            student: student,
            institution: msg.sender,
            credentialType: credentialType,
            programme: programme,
            documentHash: documentHash,
            ipfsCID: ipfsCID,
            issuedAt: block.timestamp,
            revoked: false
        });

        studentCredentials[student].push(credentialId);

        emit CredentialIssued(credentialId, student, msg.sender, credentialType);
    }

    /// @notice The issuing institution can revoke a credential it issued.
    function revokeCredential(bytes32 credentialId) external {
        Credential storage cred = credentials[credentialId];
        require(cred.issuedAt != 0, "Credential does not exist");
        require(cred.institution == msg.sender, "Only issuing institution can revoke");
        require(!cred.revoked, "Already revoked");

        cred.revoked = true;
        emit CredentialRevoked(credentialId, msg.sender);
    }

    /// @notice Anyone can verify a credential by its ID — this is the core public check.
    function verifyCredential(bytes32 credentialId)
        external
        view
        returns (
            bool exists,
            bool valid,
            address student,
            address institution,
            string memory credentialType,
            string memory programme,
            string memory documentHash,
            uint256 issuedAt
        )
    {
        Credential storage cred = credentials[credentialId];
        exists = cred.issuedAt != 0;
        valid = exists && !cred.revoked;

        return (
            exists,
            valid,
            cred.student,
            cred.institution,
            cred.credentialType,
            cred.programme,
            cred.documentHash,
            cred.issuedAt
        );
    }

    /// @notice Get all credential IDs belonging to a student — used by the student dashboard.
    function getCredentialsOf(address student) external view returns (bytes32[] memory) {
        return studentCredentials[student];
    }
}
