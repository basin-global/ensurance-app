const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SITUS OG Allowlist...");

  // Get the contract factory
  const SitusOGAllowlist = await ethers.getContractFactory("SitusOGAllowlist");

  // SITUS OG contract address (update this with the actual address)
  const situsOGAddress = "0x..."; // Update with actual SITUS OG contract address

  // Deploy the contract
  const allowlist = await SitusOGAllowlist.deploy(situsOGAddress);
  await allowlist.waitForDeployment();

  const allowlistAddress = await allowlist.getAddress();
  console.log("SITUS OG Allowlist deployed to:", allowlistAddress);

  // Verify deployment
  console.log("Verifying deployment...");
  try {
    await hre.run("verify:verify", {
      address: allowlistAddress,
      constructorArguments: [situsOGAddress],
    });
    console.log("Contract verified on Etherscan");
  } catch (error) {
    console.log("Verification failed:", error.message);
  }

  console.log("Deployment complete!");
  console.log("Allowlist Contract:", allowlistAddress);
  console.log("SITUS OG Contract:", situsOGAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });