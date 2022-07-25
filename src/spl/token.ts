import {AccountInfo, Connection, PublicKey} from "@solana/web3.js";
import {Account, ACCOUNT_SIZE, AccountLayout, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {AccountState} from "@solana/spl-token";

export async function getTokenAccountListByOwner(connection:Connection,owner:PublicKey):Promise<Account[]>{
    const res=await connection.getTokenAccountsByOwner(owner,{programId:TOKEN_PROGRAM_ID})
    const infoList=res.value
    return infoList
        .map(({pubkey,account})=>unpackAccount(account,pubkey,TOKEN_PROGRAM_ID))
}

export function unpackAccount(info:AccountInfo<Buffer>,address:PublicKey,programId:PublicKey):Account{
    const rawAccount=AccountLayout.decode(info.data.slice(0,ACCOUNT_SIZE))
    return {
        address,
        mint: rawAccount.mint,
        owner: rawAccount.owner,
        amount: rawAccount.amount,
        delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
        delegatedAmount: rawAccount.delegatedAmount,
        isInitialized: rawAccount.state !== AccountState.Uninitialized,
        isFrozen: rawAccount.state === AccountState.Frozen,
        isNative: !!rawAccount.isNativeOption,
        rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
        closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
    };
}