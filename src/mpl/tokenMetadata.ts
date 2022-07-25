import {Connection,PublicKey} from "@solana/web3.js"
import {Metadata, PROGRAM_ID, TokenStandard} from "@metaplex-foundation/mpl-token-metadata"

export async function getMetadataAccountByMint(connection:Connection,mint:PublicKey):Promise<Metadata>{
    const [pubkey,bump]= await PublicKey.findProgramAddress(
        [
            Buffer.from("metadata"),
            PROGRAM_ID.toBuffer(),
            mint.toBuffer()
        ],PROGRAM_ID
    )
    const metadata=await Metadata.fromAccountAddress(connection,pubkey)
    return metadata
}

export async function getMetadataAddress(mint:PublicKey):Promise<PublicKey>{
    const [pubkey,bump]= await PublicKey.findProgramAddress(
        [
            Buffer.from("metadata"),
            PROGRAM_ID.toBuffer(),
            mint.toBuffer()
        ],PROGRAM_ID
    )
    return pubkey
}

export function convertTokenStandard(token:TokenStandard):string{
    let name="unknown"
    switch (token){
        case TokenStandard.Fungible:
            name="Fungible"
            break;
        case TokenStandard.NonFungible:
            name="NonFungible"
            break;
        case TokenStandard.FungibleAsset:
            name="FungibleAsset"
            break;
        case TokenStandard.NonFungibleEdition:
            name="NonFungibleEdition"
            break;
        default:
            name="unknown"
    }
    return name
}
