import {Connection, PublicKey} from "@solana/web3.js";
import {PrismaClient, TokenAccount,MetadataAccount} from '@prisma/client'
import {getTokenAccountListByOwner} from "./spl/token";
import {convertTokenStandard, getMetadataAccountByMint, getMetadataAddress} from "./mpl/tokenMetadata";
import * as csv from 'fast-csv';
import * as fs from "fs";
import {Metadata} from "@metaplex-foundation/mpl-token-metadata";
const prisma = new PrismaClient()

async function downloadTokenAccountOfStepN(connection: Connection) {
    const stepn = new PublicKey("STEPNq2UGeGSzCyGVr2nMQAzf8xuejwqebd84wcksCK")
    console.log(`start to fetch account:stepn(${stepn.toBase58()})`)
    const tokenList = await getTokenAccountListByOwner(connection, stepn)
    const dataList = tokenList.map((token) => {
        return {
            address: token.address.toBase58(),
            mintAddress: token.mint.toBase58(),
            amount: token.amount.toString(),
        }
    })
    const batch = 100
    const len = dataList.length
    const step = Math.floor(len / batch)
    for (let i = 0; i < step; i++) {
        console.log(`create by batch:step(${i})`)
        const batchData = dataList.slice(i * batch, (i + 1) * batch)
        await prisma.tokenAccount.createMany({data: batchData})
    }
    console.log(`create by batch:reminder(${len - step * batch})`)
    const batchData = dataList.slice(step * batch, len)
    await prisma.tokenAccount.createMany({data: batchData})
}

async function downloadMetadataAccountOfStepN(connection: Connection) {
    const len = await prisma.tokenAccount.count()
    const start=264211
    const batch = 100
    const step = Math.floor(len-start / batch)
    for (let i = 0; i < step; i++) {
        const batchStart=i * batch+start
        const batchEnd=(i+1) * batch+start
        console.log(`get metadata by batch:step(${i})`)
        const tokens = await findAllTokenAccountByRange(batchStart,batchEnd)
        for (let token of tokens) {
            console.log(`start to create metatdata account (ID(${token.id}))`)
            await createMetadataAccount(connection, token)
        }
    }
    const remindStart=step*batch+start
    if (remindStart>=len){
        return
    }
    console.log(`get metadata by batch:reminder(${len-remindStart})`)
    const tokens = await findAllTokenAccountByRange(remindStart,len)
    for (let token of tokens) {
        console.log(`start to create metatdata account (ID(${token.id}))`)
        await createMetadataAccount(connection, token)
    }
}

async function findAllTokenAccountByRange(startId:number,endId:number):Promise<TokenAccount[]>{
    const tokens = await prisma.tokenAccount.findMany({
        where: {
            AND: [
                {
                    id: {
                        gte: startId
                    }
                },
                {
                    id: {
                        lt: endId
                    }
                }
            ]
        },
        orderBy: {id: "asc"}
    })
    return tokens
}

async function findAllMetadataAccountByRange(startId:number,endId:number):Promise<MetadataAccount[]>{
    const metaList = await prisma.metadataAccount.findMany({
        where: {
            AND: [
                {
                    id: {
                        gte: startId
                    }
                },
                {
                    id: {
                        lt: endId
                    }
                }
            ]
        },
        orderBy: {id: "asc"}
    })
    return metaList
}

async function createMetadataAccount(connection: Connection, token: TokenAccount) {
    const mint = new PublicKey(token.mintAddress)
    const metadata = await getMetadataAccountByMint(connection, mint)
    const pubkey = await getMetadataAddress(mint)
    await prisma.metadataAccount.create({
        data: {
            address: pubkey.toBase58(),
            mintAddress: metadata.mint.toBase58(),
            updateAuthorityAddress: metadata.updateAuthority.toBase58(),
            data: {
                name: metadata.data.name.replace(/\u0000/g, ''),
                symbol: metadata.data.symbol.replace(/\u0000/g, ''),
                uri: metadata.data.uri.replace(/\u0000/g, ''),
                sellerFeeBasisPoints: metadata.data.sellerFeeBasisPoints,
                creators: metadata.data.creators ? metadata.data.creators.map((creator) => {
                    return {
                        address: creator.address.toBase58(),
                        verified: creator.verified,
                        share: creator.share,
                    }
                }) : null,
            },
            editionNonce: metadata.editionNonce,
            tokenStandard: metadata.tokenStandard !== null ? convertTokenStandard(metadata.tokenStandard) : null,
            collection: metadata.collection ? {
                verified: metadata.collection.verified,
                key: metadata.collection.key.toBase58()
            } : undefined
        }
    })
}

async function getLostAccount():Promise<string[]>{
    let lost:string[]=[]
    const len = await prisma.tokenAccount.count()
    const batch = 100
    const step = Math.floor(len / batch)
    for (let i = 0; i < step; i++) {
        const batchStart=i * batch
        const batchEnd=(i+1) * batch
        console.log(`get metadata by batch:step(${i})`)
        const tokens = await findAllTokenAccountByRange(batchStart,batchEnd)
        for (let token of tokens) {
            const metadataList=await prisma.metadataAccount.findMany({
                where: {
                    mintAddress: token.mintAddress,
                }
            })
            if (!metadataList || metadataList.length===0){
                lost.push(token.mintAddress)
                continue
            }else if (metadataList.length>1){
                throw new Error(`duplicate mint of metadata`)
            }
        }
    }
    const remindStart=step*batch
    if (remindStart>=len){
        return lost
    }
    console.log(`get metadata by batch:reminder(${len-remindStart})`)
    const tokens = await findAllTokenAccountByRange(remindStart,len)
    for (let token of tokens) {
        const metadataList=await prisma.metadataAccount.findMany({
            where: {
                mintAddress: token.mintAddress,
            }
        })
        if (!metadataList || metadataList.length===0){
            lost.push(token.mintAddress)
            continue
        }else if (metadataList.length>1){
            throw new Error(`duplicate mint of metadata`)
        }
    }
    return lost
}

async function writeToCsv(){
    const batch=10000
    const len = await prisma.metadataAccount.count()
    const step=Math.floor(len/batch)
    for (let i=0;i<step;i++){
        const csvStream = csv.format({ headers: true });
        let filepath=`./metadata/metadata_${i}.csv`
        const ws=fs.createWriteStream(filepath)
        csvStream.pipe(ws)
            .on('end',()=>console.log(`file(${filepath}) write successfully`))
        const batchForMeta=100
        const stepForMeta=Math.floor(batch/batchForMeta)
        for (let j=0;j<stepForMeta;j++){
            const start=i*batch+j*batchForMeta
            const end=i*batch+(j+1)*batchForMeta
            const metaList=await findAllMetadataAccountByRange(start,end)
            await writeToCsvByBatch(csvStream,metaList)
        }
        if (batch>stepForMeta*batchForMeta){
            const start=i*batch+stepForMeta*batchForMeta
            const end=(i+1)*batch
            const metaList=await findAllMetadataAccountByRange(start,end)
            await writeToCsvByBatch(csvStream,metaList)
        }
        csvStream.end()
    }
    const csvStream = csv.format({ headers: true });
    let filepath=`./metadata/metadata_${step}.csv`
    const ws=fs.createWriteStream(filepath)
    csvStream.pipe(ws)
        .on('end',()=>console.log(`file(${filepath}) write successfully`))
    const batchForMeta=100
    const stepForMeta=Math.floor(batch/batchForMeta)
    for (let j=0;j<stepForMeta;j++){
        const start=step*batch+j*batchForMeta
        const end=step*batch+(j+1)*batchForMeta
        const metaList=await findAllMetadataAccountByRange(start,end)
        await writeToCsvByBatch(csvStream,metaList)
    }
    if (batch>stepForMeta*batchForMeta){
        const start=step*batch+stepForMeta*batchForMeta
        const end=len
        const metaList=await findAllMetadataAccountByRange(start,end)
        await writeToCsvByBatch(csvStream,metaList)
    }
    csvStream.end()
}

async function writeToCsvByBatch(
    csvStream:csv.CsvFormatterStream<any, any>,metadataList:MetadataAccount[]
){
    for (let metadata of metadataList){
        const data=metadata.data
        csvStream.write(
            {
                metadataAddress: metadata.address,
                mintAddress: metadata.mintAddress,
                updateAuthorityAddress: metadata.updateAuthorityAddress,
                editionNonce: metadata.editionNonce,
                tokenStandard: metadata.tokenStandard,
                //@ts-ignore
                name: data.name,
                //@ts-ignore
                symbol: data.symbol,
                //@ts-ignore
                uri: data.uri,
            }
        );
    }
}

async function main() {
    const rpcUrl = "https://ssc-dao.genesysgo.net/"
    const connection = new Connection(rpcUrl, "confirmed")
    // await downloadTokenAccountOfStepN(connection)
    // await downloadMetadataAccountOfStepN(connection)
    // const lost=await getLostAccount()
    // console.log(lost)
    await writeToCsv()
    console.log(`hello world`)
}

main()
    .then(() => console.log(`execute successfully`))
    .catch((e) => console.log(`execute fail,err:${e}`))
    .finally(async () => {
        await prisma.$disconnect()
        process.exit(0)
    })