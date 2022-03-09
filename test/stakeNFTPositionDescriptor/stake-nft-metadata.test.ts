import {
  Fixture,
  getFixture,
  getTokenIdFromTx,
  getValidatorEthAccount
} from '../setup'
import { ethers } from 'hardhat'
import { expect } from '../chai-setup'
import { BigNumber, BigNumberish, Signer } from 'ethers'
import {
  StakeNFT,
  StakeNFTPositionDescriptor,
  ValidatorPoolMock
} from '../../typechain-types'

describe('StakeNFTPositionDescriptor: Tests StakeNFTPositionDescriptor methods', async () => {
  let fixture: Fixture
  let randomerSigner: Signer
  let adminSigner: Signer
  let stakeNFT: StakeNFT
  let stakeNFTPositionDescriptor: StakeNFTPositionDescriptor
  let stakeAmount = 20000
  let stakeAmountMadWei = ethers.utils.parseUnits(stakeAmount.toString(), 18)
  let lockTime = 1
  let tokenId: BigNumberish

  beforeEach(async function () {
    fixture = await getFixture(true, true)
    const [admin, , , , , randomer] = fixture.namedSigners
    adminSigner = await getValidatorEthAccount(admin.address)
    randomerSigner = await getValidatorEthAccount(randomer.address)
    stakeNFT = fixture.stakeNFT
    

    const StakeNFTDescriptorFactory = await ethers.getContractFactory(
      'StakeNFTDescriptor'
    )
    const stakeNFTDescriptor = await StakeNFTDescriptorFactory.deploy()
    await stakeNFTDescriptor.deployed()

    const StakeNFTPositionDescriptorFactory = await ethers.getContractFactory(
      'StakeNFTPositionDescriptor',
      {
        libraries: {
          StakeNFTDescriptor: stakeNFTDescriptor.address
        }
      }
    )
    stakeNFTPositionDescriptor = await StakeNFTPositionDescriptorFactory.deploy()
    await stakeNFTPositionDescriptor.deployed()

    await stakeNFT.setNftStakeDescriptor(stakeNFTPositionDescriptor.address)

    await fixture.madToken.approve(
      fixture.stakeNFT.address,
      BigNumber.from(stakeAmountMadWei)
    )
    let tx = await fixture.stakeNFT
      .connect(adminSigner)
      .mintTo(admin.address, stakeAmountMadWei, lockTime)
    tokenId = await getTokenIdFromTx(tx)
  })

  it('Should return correct token uri', async function () {
    const positionData = await stakeNFT.getPosition(tokenId)

    const svg = `<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" xmlns:xlink='http://www.w3.org/1999/xlink'><text x='10' y='20'>Shares: ${positionData.shares.toString()}</text><text x='10' y='40'>Free after: ${positionData.freeAfter.toString()}</text><text x='10' y='60'>Withdraw Free After: ${positionData.withdrawFreeAfter.toString()}</text><text x='10' y='80'>Accumulator (ETH): ${positionData.accumulatorEth.toString()}</text><text x='10' y='100'>Accumulator (Token): ${positionData.accumulatorToken.toString()}</text></svg>`

    const tokenUriJson = `{"name":"MadNET Staked token for position #1", "description":"This NFT represents a staked position on MadNET.\\nThe owner of this NFT can modify or redeem the position.\\n Shares: 20000000000000000000000\\nFree After: 75\\nWithdraw Free After: 1\\nAccumulator Eth: 0\\nAccumulator Token: 0\\nToken ID: 1", "image": "data:image/svg+xml;base64,${btoa(
      svg
    )}"}`

    const expectedTokenUriData = `data:application/json;base64,${btoa(
      tokenUriJson
    )}`

    const tokenUri = await stakeNFT.tokenURI(tokenId)

    const parsedJson = JSON.parse(
      atob(tokenUri.replace('data:application/json;base64,', ''))
    )

    await expect(tokenUri).to.be.equal(expectedTokenUriData)
    await expect(
      atob(parsedJson.image.replace('data:image/svg+xml;base64,', ''))
    ).to.be.equal(svg)
  })
})
