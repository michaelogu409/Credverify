// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AccessControl
/// @notice Manages roles for VeriChain: admins, institutions, and verifiers.
/// @dev Other contracts (e.g. CredentialRegistry) can reference this contract
///      to check whether an address is an authorized institution or verifier,
///      instead of managing their own role list.
contract AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // role => account => hasRole
    mapping(bytes32 => mapping(address => bool)) private roles;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed grantedBy);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed revokedBy);

    modifier onlyAdmin() {
        require(roles[ADMIN_ROLE][msg.sender], "Caller is not an admin");
        _;
    }

    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /// @notice Check if an account holds a given role.
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return roles[role][account];
    }

    /// @notice Convenience check used by other contracts / the frontend.
    function isInstitution(address account) external view returns (bool) {
        return roles[INSTITUTION_ROLE][account];
    }

    /// @notice Convenience check used by other contracts / the frontend.
    function isVerifier(address account) external view returns (bool) {
        return roles[VERIFIER_ROLE][account];
    }

    /// @notice Convenience check used by other contracts / the frontend.
    function isAdmin(address account) external view returns (bool) {
        return roles[ADMIN_ROLE][account];
    }

    /// @notice Admin grants any role to an account.
    function grantRole(bytes32 role, address account) external onlyAdmin {
        _grantRole(role, account);
    }

    /// @notice Admin revokes any role from an account.
    function revokeRole(bytes32 role, address account) external onlyAdmin {
        require(roles[role][account], "Account does not have this role");
        roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /// @notice Shortcut: admin registers a new institution wallet.
    function registerInstitution(address institution) external onlyAdmin {
        _grantRole(INSTITUTION_ROLE, institution);
    }

    /// @notice Shortcut: admin removes an institution's access.
    function removeInstitution(address institution) external onlyAdmin {
        require(roles[INSTITUTION_ROLE][institution], "Not currently an institution");
        roles[INSTITUTION_ROLE][institution] = false;
        emit RoleRevoked(INSTITUTION_ROLE, institution, msg.sender);
    }

    /// @notice Shortcut: admin registers a new verifier wallet (e.g. an employer/org).
    function registerVerifier(address verifier) external onlyAdmin {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    /// @notice Shortcut: admin removes a verifier's access.
    function removeVerifier(address verifier) external onlyAdmin {
        require(roles[VERIFIER_ROLE][verifier], "Not currently a verifier");
        roles[VERIFIER_ROLE][verifier] = false;
        emit RoleRevoked(VERIFIER_ROLE, verifier, msg.sender);
    }

    /// @notice Admin can promote another account to admin.
    function addAdmin(address account) external onlyAdmin {
        _grantRole(ADMIN_ROLE, account);
    }

    function _grantRole(bytes32 role, address account) internal {
        require(account != address(0), "Invalid address");
        roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
}
