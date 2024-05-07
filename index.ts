import axios, {AxiosResponse} from "axios"
import * as express from "express"
import {v4 as uuid} from "uuid"
import * as fs from "node:fs/promises"
import * as process from "process"
import * as https from "https"
var cors = require("cors")


const apiKey = ""
const onaylarimServiceUrl = "https://apitest.onaylarim.com"

const httpsAgent = new https.Agent({rejectUnauthorized: false})
const client = axios.create({
    baseURL: onaylarimServiceUrl,
    httpsAgent: httpsAgent
})

const app = express()
app.use(express.json())
app.use(cors())
const port = 3000

if (!apiKey || apiKey === "" || apiKey === null || apiKey === undefined) {
    console.error("API Key is not set")
    process.exit(1)
}

app.post("/Onaylarim/CreateStateOnOnaylarimApi", async (req, res) => {
    const response = await createStateOnOnaylarimHandler({
        certificate: req.body.certificate,
        signatureType: req.body.signatureType
    })

    res.json(response)
})

app.post("/Onaylarim/FinishSign", async (req, res) => {
    const response = await finishSign({
        dontUpgradeToLtv: req.body.dontUpgradeToLtv,
        signedData: req.body.signedData,
        keyId: req.body.keyId,
        keySecret: req.body.keySecret,
        operationId: req.body.operationId,
        signatureType: req.body.signatureType
    })

    res.json(response)
})

app.post("/Onaylarim/GetFingerPrint", async (req, res) => {
    const response = await getFingerPrint({
        operationId: req.body.operationId
    })

    res.json(response)
})
app.post("/Onaylarim/MobileSign", async (req, res) => {
    const response = await mobileSign({
        operationId: req.body.operationId,
        signatureType: req.body.signatureType,
        phoneNumber: req.body.phoneNumber,
        operator: req.body.operator,
        citizenshipNo: req.body.citizenshipNo
    })

    res.json(response)
})

app.get("/Onaylarim/DownloadSignedFileFromOnaylarimApi", async (req, res) => {
    const operationId = req.query.operationId as string
    await downloadSignedFileFromOnaylarimApi(operationId, res)
})

app.get("/Onaylarim/ConvertToPdf", async (req, res) => {
    await convertToPdf(res)
})

app.get("/Onaylarim/AddLayers", async (req, res) => {
    await addLayers(res)
})

app.get("/Onaylarim/UpgradePades", async (req, res) => {
    await upgradePades(res)
})

app.get("/Onaylarim/UpgradeCades", async (req, res) => {
    await upgradeCades(res)
})

app.get("/Onaylarim/VerifySignaturesOnOnaylarimApi", async (req, res) => {
    await verifySignaturesOnOnaylarimApi(res)
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

const send = () => {}

const createStateOnOnaylarimHandler = async (request: CreateStateOnOnaylarimApiRequest): Promise<CreateStateOnOnaylarimApiResult> => {
    console.log("CreateStateOnOnaylarimApi start")

    const result: CreateStateOnOnaylarimApiResult = {
        keyID: "",
        keySecret: "",
        state: "",
        operationId: ""
    }

    const operationId = uuid()

    try {
        if (request.signatureType === "cades") {
            const fileData = await fs.readFile(`${process.cwd()}\\Resources\\2023-04-14_Api_Development.log`)

            const signStepOneCoreResult = await client.post<ApiResult<SignStepOneCadesCoreResult>>(
                "/CoreApiCades/SignStepOneCadesCore",
                new SignStepOneCadesCoreRequest({
                    cerBytes: request.certificate,
                    fileData: fileData.toString("base64"),
                    signatureIndex: 0,
                    operationId: operationId,
                    requestId: uuid().replace("-", "").substring(0, 21),
                    displayLanguage: "en"
                }),
                {
                    headers: {
                        "X-API-KEY": apiKey
                    }
                }
            )

            result.keyID = signStepOneCoreResult.data.result.keyID
            result.keySecret = signStepOneCoreResult.data.result.keySecret
            result.state = signStepOneCoreResult.data.result.state
            result.operationId = operationId
        } else if (request.signatureType === "pades") {
            try {
                const fileData = await fs.readFile(`${process.cwd()}\\Resources\\sample.pdf`)
                const signatureWidgetBackground = await fs.readFile(`${process.cwd()}\\Resources\\Signature011.jpg`)

                const uploadFileBeforeOperation = false

                if (uploadFileBeforeOperation) {
                    const formData = new FormData()
                    formData.append("file", new Blob([fileData]), "sample.pdf")

                    const signStepOneUploadFileResult = await client.post<ApiResult<SignStepOnePadesCoreResult>>(
                        "/CoreApiPades/SignStepOneUploadFile",
                        formData,
                        {
                            headers: {
                                "X-API-KEY": apiKey,
                                operationid: operationId,
                                "Content-Type": "multipart/form-data"
                            }
                        }
                    )

                    if (signStepOneUploadFileResult.data.error) {
                        console.error("signStepOneUploadFileResult", signStepOneUploadFileResult.data.error)
                        result.error = signStepOneUploadFileResult.data.error
                        return result
                    }

                    console.log("Upload file request successfull")

                    // Handle signStepOneUploadFileResult if needed
                }
                const data = new SignStepOnePadesCoreRequest({
                    cerBytes: request.certificate,
                    fileData: uploadFileBeforeOperation ? "" : fileData.toString("base64"),
                    signatureIndex: 1,
                    operationId: operationId,
                    requestId: uuid().replace("-", "").substring(0, 21),
                    displayLanguage: "en",
                    verificationInfo: new VerificationInfo({
                        text: "Bu belge 5070 sayılı elektronik imza kanununa göre güvenli elektronik imza ile imzalanmıştır. Belgeye\r\nhttps://localhost:8082 adresinden 97275466-4A90128E46284E3181CF21020554BFEC452DBDE73",
                        width: 0.8,
                        height: 0.1,
                        left: 0.1,
                        bottom: 0.03,
                        transformOrigin: "left bottom"
                    }),
                    qrCodeInfo: new QrCodeInfo({text: "google.com", width: 0.1, right: 0.03, top: 0.02, transformOrigin: "right top"}),
                    signatureWidgetInfo: new SignatureWidgetInfo({
                        width: 100,
                        height: 50,
                        left: 0.5,
                        top: 0.03,
                        transformOrigin: "left top",
                        imageBytes: signatureWidgetBackground.toString("base64"),
                        pagesToPlaceOn: [0],
                        lines: [
                            {
                                bottomMargin: 4,
                                colorHtml: "#000000",
                                fontName: "Arial",
                                fontSize: 10,
                                fontStyle: "Bold",
                                leftMargin: 4,
                                rightMargin: 4,
                                text: "Ali Hadi Öztürk",
                                topMargin: 4
                            },
                            {
                                bottomMargin: 4,
                                colorHtml: "#000000",
                                fontName: "Arial",
                                fontSize: 10,
                                fontStyle: "Bold",
                                leftMargin: 4,
                                rightMargin: 4,
                                text: "Bülent Çakıroğlu",
                                topMargin: 4
                            },
                            {
                                bottomMargin: 4,
                                colorHtml: "#FF0000",
                                fontName: "Arial",
                                fontSize: 10,
                                fontStyle: "Regular",
                                leftMargin: 4,
                                rightMargin: 4,
                                text: "2024-05-07",
                                topMargin: 6
                            }
                        ]
                    })
                })

                console.log(JSON.stringify(data))

                const signStepOneCoreResult = await client.post<ApiResult<SignStepOnePadesCoreResult>>("/CoreApiPades/SignStepOnePadesCore", data, {
                    headers: {
                        "X-API-KEY": apiKey
                    }
                })

                if (!signStepOneCoreResult.data.error) {
                    result.keyID = signStepOneCoreResult.data.result.keyID
                    result.keySecret = signStepOneCoreResult.data.result.keySecret
                    result.state = signStepOneCoreResult.data.result.state
                    result.operationId = operationId
                } else {
                    result.error = signStepOneCoreResult.data.error
                }
            } catch (error) {
                console.log("ERROR", error)
            }

            console.log("ewıoquhewqhuıewhqeuhwqehuwquheqwuho")

            return result
        }
    } catch (ex) {
        console.log(ex)
    }

    return result
}

const finishSign = async (request: FinishSignRequest): Promise<FinishSignResult> => {
    console.log("FinishSign")

    const result: FinishSignResult = {
        isSuccess: false
    }

    try {
        if (request.signatureType === "cades") {
            const signStepOneUploadFileResult = await client.post<ApiResult<SignStepThreeCadesCoreResult>>(
                "/CoreApiCades/signStepThreeCadesCore",
                new SignStepThreeCadesCoreRequest({
                    signedData: request.signedData,
                    keyId: request.keyId,
                    keySecret: request.keySecret,
                    operationId: request.operationId,
                    requestId: uuid().replace("-", "").substring(0, 21),
                    displayLanguage: "en"
                }),
                {
                    headers: {
                        "X-API-KEY": apiKey
                    }
                }
            )

            result.isSuccess = signStepOneUploadFileResult.data.result.isSuccess
        } else if (request.signatureType === "pades") {
            const signStepOneUploadFileResult = await client.post<ApiResult<SignStepThreePadesCoreResult>>(
                "/CoreApiPades/signStepThreePadesCore",
                new SignStepThreePadesCoreRequest({
                    signedData: request.signedData,
                    keyId: request.keyId,
                    dontUpgradeToLtv: request.dontUpgradeToLtv,
                    keySecret: request.keySecret,
                    operationId: request.operationId,
                    requestId: uuid().replace("-", "").substring(0, 21),
                    displayLanguage: "en"
                }),
                {
                    headers: {
                        "X-API-KEY": apiKey
                    }
                }
            )

            result.isSuccess = signStepOneUploadFileResult.data.result.isSuccess
        }
    } catch (ex) {
        console.error(ex)
    }

    return result
}

const mobileSign = async (request: MobileSignRequest): Promise<MobilSignResult> => {
    var result: MobilSignResult = {
        isSuccess: false,
        error: ""
    }

    if (request.signatureType == "cades") {
        const fileData = await fs.readFile(`${process.cwd()}\\Resources\\sample.pdf`)
        try {
            var signStepOneCoreResult = await client.post<ApiResult<SignStepOneCoreInternalForCadesMobileResult>>(
                `/CoreApiCadesMobile/SignStepOneCadesMobileCore`,
                new SignStepOneCadesMobileCoreRequest({
                    fileData: fileData.toString("base64"),
                    signatureIndex: 0,
                    operationId: request.operationId,
                    requestId: uuid().replace("-", "").substring(0, 21),
                    displayLanguage: "en",
                    phoneNumber: request.phoneNumber,
                    operator: request.operator,
                    userPrompt: "CoreAPI ile belge imzalayacaksınız.",
                    citizenshipNo: request.citizenshipNo
                }),
                {
                    headers: {
                        "X-API-KEY": apiKey
                    }
                }
            )

            if (signStepOneCoreResult.data.error) {
                result.error = signStepOneCoreResult.data.error
            } else {
                result.isSuccess = signStepOneCoreResult.data.result.isSuccess
            }
        } catch (error) {
            console.log("ERROR", error)
            result.error = error as string
        }
    } else if (request.signatureType === "pades") {
        const fileData = await fs.readFile(`${process.cwd()}\\Resources\\sample.pdf`)
        try {
            var signStepOneCoreResult = await client.post<ApiResult<SignStepOneCoreInternalForPadesMobileResult>>(
                `/CoreApiPadesMobile/SignStepOnePadesMobileCore`,
                new SignStepOnePadesMobileCoreRequest({
                    fileData: fileData.toString("base64"),
                    signatureIndex: 0,
                    operationId: request.operationId,
                    requestId: uuid().replace("-", "").substring(0, 21),
                    displayLanguage: "en",
                    verificationInfo: new VerificationInfo({
                        text: "Bu belge 5070 sayılı elektronik imza kanununa göre güvenli elektronik imza ile imzalanmıştır. Belgeye\r\nhttps://localhost:8082 adresinden 97275466-4A90128E46284E3181CF21020554BFEC452DBDE73",
                        width: 0.8,
                        height: 0.1,
                        left: 0.1,
                        bottom: 0.03,
                        transformOrigin: "left bottom"
                    }),
                    qrCodeInfo: new QrCodeInfo({
                        text: "google.com",
                        width: 0.1,
                        right: 0.03,
                        top: 0.02,
                        transformOrigin: "right top"
                    }),
                    phoneNumber: request.phoneNumber,
                    operator: request.operator,
                    userPrompt: "CoreAPI ile belge imzalayacaksınız.",
                    citizenshipNo: request.citizenshipNo
                }),
                {
                    headers: {
                        "X-API-KEY": apiKey
                    }
                }
            )

            if (signStepOneCoreResult.data.error) {
                result.error = signStepOneCoreResult.data.error
            } else {
                result.isSuccess = signStepOneCoreResult.data.result.isSuccess
            }
        } catch (error) {
            console.log("ERROR", error)
            result.error = error as string
        }
    }

    return result
}

const getFingerPrint = async (request: GetFingerPrintRequest): Promise<GetFingerPrintResult> => {
    const result: GetFingerPrintResult = {
        fingerPrint: ""
    }
    try {
        var signStepOneCoreResult = await client.post<GetFingerPrintCoreRequest, ApiResult<GetFingerPrintCoreResult>>(
            "/CoreApiPadesMobile/GetFingerPrintCore",
            new GetFingerPrintCoreRequest({
                operationId: request.operationId,
                requestId: uuid().replace("-", "").substring(0, 21),
                displayLanguage: "en"
            }),
            {
                headers: {
                    "X-API-KEY": apiKey
                }
            }
        )

        result.fingerPrint = signStepOneCoreResult.result.fingerPrint
    } catch (error) {}

    return result
}

const downloadSignedFileFromOnaylarimApi = async (operationId: string, res: express.Response) => {
    try {
        console.log("Starting download with operationId:", operationId)
        var downloadSignedFileCoreResult = await client.post<ApiResult<DownloadSignedFileCoreResult>>(
            "/CoreApiDownload/DownloadSignedFileCore",
            new DownloadSignedFileCoreRequest({
                operationId: operationId,
                requestId: uuid().replace("-", "").substring(0, 21),
                displayLanguage: "en"
            }),
            {
                headers: {
                    "X-API-KEY": apiKey
                }
            }
        )

        if (downloadSignedFileCoreResult.data.error) {
            console.log("Error while downloading from server: ", downloadSignedFileCoreResult.data.error)
            res.status(500).send({message: downloadSignedFileCoreResult.data.error})
            return
        }

        console.log("Downloaded", downloadSignedFileCoreResult.data.result)

        const filePath = `${process.cwd()}\\Resources\\${downloadSignedFileCoreResult.data.result.fileName}.imz` // Replace with the desired file
        await fs.writeFile(filePath, Buffer.from(downloadSignedFileCoreResult.data.result.fileData, "base64")).then(() => {
            res.contentType("application/octet-stream")
            res.sendFile(filePath)
        })
        return
    } catch (error) {
        console.log("ERROR", error)
    }

    res.status(400).send({message: "Hata"})
}

const convertToPdf = async (res: express.Response) => {
    try {
        // File can be get from request or file system
        const fileData = await fs.readFile(`${process.cwd()}\\Resources\\yeni proje.docx`)

        var downloadSignedFileCoreResult = await client.post<ApiResult<ConvertToPdfCoreResult>>(
            "/CoreApiPdf/ConvertToPdfCore",
            new ConvertToPdfCoreRequest({
                fileData: fileData.toString("base64"),
                fileName: "yeni proje.docx",
                operationId: uuid(),
                requestId: uuid().replace("-", "").substring(0, 21),
                displayLanguage: "en"
            }),
            {
                headers: {
                    "X-API-KEY": apiKey
                }
            }
        )

        const filePath = `${process.cwd()}\\Resources\\converted.pdf` // Replace with the desired file
        await fs.writeFile(filePath, Buffer.from(downloadSignedFileCoreResult.data.result.fileData, "base64"))

        res.sendFile(filePath)
        return
    } catch (error) {
        console.log("ERROR", error)
    }

    res.status(400).send({message: "Hata"})
}

const addLayers = async (res: express.Response) => {
    try {
        // File can be get from request or file system
        const fileData = await fs.readFile(`${process.cwd()}\\Resources\\sample.pdf`)

        var downloadSignedFileCoreResult = await client.post<ApiResult<AddLayersCoreResult>>(
            "/CoreApiPdf/AddLayersCore",
            new AddLayersCoreRequest({
                fileData: fileData.toString("base64"),
                fileName: "sample.pdf",
                operationId: uuid(),
                requestId: uuid().replace("-", "").substring(0, 21),
                displayLanguage: "en",
                verificationInfo: new VerificationInfo({
                    text: "Bu belge 5070 sayılı elektronik imza kanununa göre güvenli elektronik imza ile imzalanmıştır. Belgeye\r\nhttps://localhost:8082 adresinden 97275466-4A90128E46284E3181CF21020554BFEC452DBDE73",
                    width: 0.8,
                    height: 0.1,
                    left: 0.1,
                    bottom: 0.03,
                    transformOrigin: "left bottom"
                }),
                qrCodeInfo: new QrCodeInfo({
                    text: "google.com",
                    width: 0.1,
                    right: 0.03,
                    top: 0.02,
                    transformOrigin: "right top"
                })
            }),
            {
                headers: {
                    "X-API-KEY": apiKey
                }
            }
        )

        const filePath = `${process.cwd()}\\Resources\\pdf000.pdf` // Replace with the desired file
        await fs.writeFile(filePath, Buffer.from(downloadSignedFileCoreResult.data.result.fileData, "base64"))

        res.sendFile(filePath)
        return
    } catch (error) {
        console.log("ERROR", error)
    }

    res.status(400).send({message: "Hata"})
}

const upgradePades = async (res: express.Response) => {
    var signStepOneUploadFileResult: AxiosResponse<ApiResult<SignStepOneUploadFileResult>> | null = null

    const operationId = uuid()
    try {
        // File can be get from request or file system

        const fileData = await fs.readFile(`${process.cwd()}\\Resources\\cok imzali.pdf`)

        const formData = new FormData()
        formData.append("file", new Blob([fileData]), "cok imzali.pdf")

        signStepOneUploadFileResult = await client.post<ApiResult<SignStepOneUploadFileResult>>("/CoreApiPades/SignStepOneUploadFile", formData, {
            headers: {
                "X-API-KEY": apiKey,
                operationid: operationId
            }
        })

        console.log("Operation ID: ", signStepOneUploadFileResult.data.result.operationId)
    } catch (error) {
        console.log("ERROR", error)
    }

    if (!signStepOneUploadFileResult) {
        res.status(400).send({message: "Hata"})
        return
    } else if (signStepOneUploadFileResult.data.error) {
        res.status(400).send({message: signStepOneUploadFileResult.data.error})
        return
    }

    var signStepOneCoreResult: AxiosResponse<ApiResult<UpgradePadesCoreResult>> | null = null

    try {
        signStepOneCoreResult = await client.post<ApiResult<SignStepOneUploadFileResult>>(
            "/CoreApiPades/UpgradePadesCore",
            new UpgradePadesCoreRequest({
                operationId: signStepOneUploadFileResult?.data.result.operationId,
                requestId: uuid().replace("-", "").substring(0, 21),
                displayLanguage: "en"
            }),
            {
                headers: {
                    "X-API-KEY": apiKey
                }
            }
        )

        res.send(operationId)
        return
    } catch (error) {}

    if (!signStepOneCoreResult.data) {
        res.status(400).send({message: "Hata"})
        return
    } else if (signStepOneCoreResult.data.error) {
        res.status(400).send({message: "Hata"})
        return
    } else if (!signStepOneCoreResult.data.result.isSuccess) {
        res.status(400).send({message: "Hata"})
        return
    }

    res.status(400).send({message: "Hata"})
}

const upgradeCades = async (res: express.Response) => {
    var signStepOneUploadFileResult: AxiosResponse<ApiResult<SignStepOneUploadFileResult>> | null = null

    const operationId = uuid()
    try {
        // File can be get from request or file system

        const fileData = await fs.readFile(`${process.cwd()}\\Resources\\dosya.imz`)

        const formData = new FormData()
        formData.append("file", new Blob([fileData]), "dosya.imz")

        signStepOneUploadFileResult = await client.post<ApiResult<SignStepOneUploadFileResult>>("/CoreApiPades/SignStepOneUploadFile", formData, {
            headers: {
                "X-API-KEY": apiKey,
                operationid: operationId
            }
        })
    } catch (error) {
        console.log("ERROR", error)
    }

    if (!signStepOneUploadFileResult) {
        res.status(400).send({message: "Hata"})
        return
    } else if (signStepOneUploadFileResult.data.error) {
        res.status(400).send({message: signStepOneUploadFileResult.data.error})
        return
    }

    var signStepOneCoreResult: AxiosResponse<ApiResult<UpgradeCadesCoreResult>> | null = null

    try {
        signStepOneCoreResult = await client.post<ApiResult<UpgradeCadesCoreResult>>(
            "/CoreApiCades/UpgradeCadesCore",
            new UpgradeCadesCoreRequest({
                operationId: signStepOneUploadFileResult?.data.result.operationId,
                requestId: uuid().replace("-", "").substring(0, 21),
                displayLanguage: "en"
            }),
            {
                headers: {
                    "X-API-KEY": apiKey
                }
            }
        )

        res.send(operationId)
        return
    } catch (error) {
        console.log("ERROR", error)
    }

    if (!signStepOneCoreResult) {
        res.status(400).send({message: "Hata"})
        return
    } else if (signStepOneCoreResult.data.error) {
        res.status(400).send({message: "Hata"})
        return
    } else if (!signStepOneCoreResult.data.result.isSuccess) {
        res.status(400).send({message: "Hata"})
        return
    }

    res.status(400).send({message: "Hata"})
}

const verifySignaturesOnOnaylarimApi = async (res: express.Response) => {
    var result: VerifySignaturesCoreResult = {
        captchaError: false,
        allSignaturesValid: false,
        signatures: [],
        timestamps: [],
        fileName: "",
        signatureType: ""
    }

    var operationId = uuid()

    const fileData = await fs.readFile(`${process.cwd()}\\Resources\\cok imzali.pdf`)

    const formData = new FormData()
    formData.append("file", new Blob([fileData]), "cok imzali.pdf")

    const resp = await client.post<any, ApiResult<VerifySignaturesCoreResult>>("/CoreApiPades/SignStepOneUploadFile", formData, {
        headers: {
            "X-API-KEY": apiKey,
            operationid: operationId
        }
    })

    if (resp.error) {
        res.status(400).send({message: resp.error})
        return
    }

    res.send(resp.result)
}

export class BaseRequest {
    requestId: string
    displayLanguage: string
}

export class AddLayersCoreResult {
    fileData: string
}

export class UpgradePadesCoreRequest extends BaseRequest {
    constructor(props: Partial<UpgradePadesCoreRequest> = {}) {
        super()
        this.operationId = props.operationId || ""
        this.requestId = props.requestId || ""
        this.displayLanguage = props.displayLanguage || ""
    }
    operationId: string
    // Add other properties with default values here
}

export class UpgradeCadesCoreRequest extends BaseRequest {
    constructor(props: Partial<UpgradeCadesCoreRequest> = {}) {
        super()
        this.operationId = props.operationId || ""
        this.requestId = props.requestId || ""
        this.displayLanguage = props.displayLanguage || ""
    }
    operationId: string
    // Add other properties with default values here
}

export class AddLayersCoreRequest extends BaseRequest {
    constructor(props: Partial<AddLayersCoreRequest> = {}) {
        super()
        this.operationId = props.operationId || ""
        this.fileData = props.fileData || ""
        this.fileName = props.fileName || ""
        this.verificationInfo = props.verificationInfo || null
        this.qrCodeInfo = props.qrCodeInfo || null
        this.requestId = props.requestId || ""
        this.displayLanguage = props.displayLanguage || ""
    }
    operationId: string
    fileData: string
    fileName: string
    verificationInfo: VerificationInfo
    qrCodeInfo: QrCodeInfo
}

export class ApiResult<T> {
    result: T
    error: string
}

export class ConvertToPdfCoreResult {
    fileData: string
}

export class ConvertToPdfCoreRequest extends BaseRequest {
    constructor(props: Partial<ConvertToPdfCoreRequest> = {}) {
        super()
        this.operationId = props.operationId || ""
        this.fileData = props.fileData || ""
        this.fileName = props.fileName || ""
        this.displayLanguage = props.displayLanguage || ""
        this.requestId = props.requestId || ""
    }
    operationId: string
    fileData: string
    fileName: string
}

export class CreateStateOnOnaylarimApiRequest {
    certificate: string
    signatureType: string
}

export class CreateStateOnOnaylarimApiResult {
    state: string
    keyID: string
    keySecret: string
    operationId: string
    error?: string
}

export class UpgradePadesCoreResult {
    isSuccess: boolean
}

export class UpgradeCadesCoreResult {
    isSuccess: boolean
}

export class DownloadSignedFileCoreResult {
    operationId: string
    fileData: string
    fileName: string
}

export class DownloadSignedFileCoreRequest extends BaseRequest {
    constructor(props: Partial<DownloadSignedFileCoreRequest> = {}) {
        super()
        Object.assign(this, props)
    }
    operationId: string
}

export class GetFingerPrintCoreRequest extends BaseRequest {
    /**
     *
     */
    constructor(props: GetFingerPrintCoreRequest) {
        super()
        this.operationId = props.operationId
        this.requestId = props.requestId
        this.displayLanguage = props.displayLanguage
    }
    operationId: string
}

export class GetFingerPrintCoreResult {
    fingerPrint: string
}

export class GetFingerPrintRequest {
    operationId: string
}

export class GetFingerPrintResult {
    fingerPrint: string
}

export class FinishSignRequest {
    dontUpgradeToLtv: boolean
    signedData: string
    keyId: string
    keySecret: string
    operationId: string
    signatureType: string
}

export class FinishSignResult {
    isSuccess: boolean
}

export class MobilSignResult {
    isSuccess: boolean
    error: string
}

export class MobileSignRequest {
    operationId: string
    signatureType: string
    phoneNumber: string
    operator: string
    citizenshipNo: string | null
}

export class SignStepOneCadesCoreRequest extends BaseRequest {
    constructor(props: Partial<SignStepOneCadesCoreRequest> = {}) {
        super()
        this.cerBytes = props.cerBytes || ""
        this.fileData = props.fileData || ""
        this.signatureIndex = props.signatureIndex || 0
        this.coordinates = props.coordinates || null
        this.operationId = props.operationId || ""
        this.requestId = props.requestId || ""
        this.displayLanguage = props.displayLanguage || ""
    }
    cerBytes: string
    fileData: string
    signatureIndex: number
    coordinates: SignStepOneRequestCoordinates
    operationId: string
}

export class SignStepOneCadesCoreResult {
    state: string
    keyID: string
    keySecret: string
}

export class SignStepOneCoreInternalForPadesMobileResult {
    isSuccess: boolean
}

export class SignStepOneCoreInternalForCadesMobileResult {
    isSuccess: boolean
}

export class SignStepOnePadesMobileCoreRequest extends BaseRequest {
    constructor(props: Partial<SignStepOnePadesMobileCoreRequest> = {}) {
        super()
        this.fileData = props.fileData || ""
        this.signatureIndex = props.signatureIndex || 0
        this.coordinates = props.coordinates || null
        this.operationId = props.operationId || ""
        this.verificationInfo = props.verificationInfo || null
        this.qrCodeInfo = props.qrCodeInfo || null
        this.phoneNumber = props.phoneNumber || ""
        this.operator = props.operator || ""
        this.userPrompt = props.userPrompt || ""
        this.citizenshipNo = props.citizenshipNo || null
        this.requestId = props.requestId || ""
        this.displayLanguage = props.displayLanguage || ""
    }
    fileData: string
    signatureIndex: number
    coordinates: SignStepOneRequestCoordinates
    operationId: string
    verificationInfo: VerificationInfo
    qrCodeInfo: QrCodeInfo
    phoneNumber: string
    operator: string
    userPrompt: string
    citizenshipNo: string | null
}

export class SignStepOneCadesMobileCoreRequest extends BaseRequest {
    constructor(props: Partial<SignStepOneCadesMobileCoreRequest>) {
        super()
        this.fileData = props.fileData || ""
        this.signatureIndex = props.signatureIndex || 0
        this.coordinates = props.coordinates || null
        this.operationId = props.operationId || ""
        this.phoneNumber = props.phoneNumber || ""
        this.operator = props.operator || ""
        this.userPrompt = props.userPrompt || ""
        this.citizenshipNo = props.citizenshipNo || null
        this.requestId = props.requestId || ""
        this.displayLanguage = props.displayLanguage || ""
    }
    cerBytes: string | ""
    fileData: string | ""
    signatureIndex: number
    coordinates: SignStepOneRequestCoordinates | null
    operationId: string
    phoneNumber: string
    operator: string
    userPrompt: string
    citizenshipNo: string | null
}

export class SignStepOnePadesCoreRequest extends BaseRequest {
    constructor(props: Partial<SignStepOnePadesCoreRequest> = {}) {
        super()
        this.requestId = props.requestId
        this.displayLanguage = props.displayLanguage
        this.cerBytes = props.cerBytes || ""
        this.fileData = props.fileData || ""
        this.signatureIndex = props.signatureIndex || 0
        this.coordinates = props.coordinates || null
        this.operationId = props.operationId || ""
        this.verificationInfo = props.verificationInfo || null
        this.qrCodeInfo = props.qrCodeInfo || null
        this.signatureWidgetInfo = props.signatureWidgetInfo || null
    }
    cerBytes: string
    fileData: string
    signatureIndex: number
    coordinates: SignStepOneRequestCoordinates
    operationId: string
    verificationInfo: VerificationInfo
    qrCodeInfo: QrCodeInfo
    signatureWidgetInfo: SignatureWidgetInfo
}

export class SignStepOnePadesCoreResult {
    state: string
    keyID: string
    keySecret: string
    error?: any
}

export class SignStepOneRequestCoordinates {
    accuracy: number | null
    altitude: number | null
    altitudeAccuracy: number | null
    heading: number | null
    latitude: number
    longitude: number
    speed: number | null
}

export class SignStepThreeCadesCoreResult {
    isSuccess: boolean
}

export class SignStepThreeCadesCoreRequest extends BaseRequest {
    constructor(props: Partial<SignStepThreeCadesCoreRequest> = {}) {
        super()
        Object.assign(this, props)
    }
    signedData: string
    keyId: string
    keySecret: string
    operationId: string
}

export class SignStepThreePadesCoreResult {
    isSuccess: boolean
}

export class SignStepThreePadesCoreRequest extends BaseRequest {
    constructor(props: Partial<SignStepThreePadesCoreRequest> = {}) {
        super()
        Object.assign(this, props)
    }
    dontUpgradeToLtv: boolean
    signedData: string
    keyId: string
    keySecret: string
    operationId: string
}

export class QrCodeInfo {
    constructor(props: Partial<QrCodeInfo> = {}) {
        this.text = props.text || ""
        this.width = props.width || 0
        this.left = props.left || null
        this.right = props.right || null
        this.top = props.top || null
        this.bottom = props.bottom || null
        this.transformOrigin = props.transformOrigin || ""
    }
    text: string
    width: number
    left: number | null
    right: number | null
    top: number | null
    bottom: number | null
    transformOrigin: string
}

export class VerificationInfo {
    text: string
    width: number
    height: number
    left: number | null
    right: number | null
    top: number | null
    bottom: number | null
    transformOrigin: string

    constructor(props: Partial<VerificationInfo> = {}) {
        this.text = props.text || ""
        this.width = props.width || 0
        this.height = props.height || 0
        this.left = props.left || null
        this.right = props.right || null
        this.top = props.top || null
        this.bottom = props.bottom || null
        this.transformOrigin = props.transformOrigin || ""
    }
}

export class SignatureWidgetInfo {
    constructor(props: Partial<SignatureWidgetInfo> = {}) {
        this.width = props.width || 0
        this.height = props.height || 0
        this.left = props.left || null
        this.right = props.right || null
        this.top = props.top || null
        this.bottom = props.bottom || null
        this.transformOrigin = props.transformOrigin || ""
        this.imageBytes = props.imageBytes || ""
        this.pagesToPlaceOn = props.pagesToPlaceOn || []
        this.lines = props.lines || []
    }
    width: number
    height: number
    left: number | null
    right: number | null
    top: number | null
    bottom: number | null
    transformOrigin: string
    imageBytes: string
    pagesToPlaceOn: number[]
    lines: LineInfo[]
}

export class LineInfo {
    text: string
    leftMargin: number
    topMargin: number
    bottomMargin: number
    rightMargin: number
    fontName: string
    fontSize: number
    fontStyle: string
    colorHtml: string
}

export class SignStepOneUploadFileResult {
    isSuccess: boolean
    operationId: string
}

export class VerifySignaturesCoreResult {
    captchaError: boolean
    allSignaturesValid: boolean
    signatures: VerifyDocumentResultSignature[]
    timestamps: VerifyDocumentResultTimestamp[]
    fileName: string
    signatureType: string
}

export class VerifyDocumentResultSignature {
    chainValidationResult: string
    claimedSigningTime: string
    hashAlgorithm: string
    profile: string
    timestamped: boolean
    reason: string
    level: string
    citizenshipNo: string
    fullName: string
    isExpanded: boolean
    index: number
    issuerRDN: string
    serialNumber: string
    serialNumberString: string
    subjectKeyID: string
    subjectKeyIDString: string
}

export class VerifyDocumentResultTimestamp {
    time: string
    tSAName: string
    timestampType: number
    index: number
    issuerRDN: string
    serialNumber: string
    serialNumberString: string
    subjectKeyID: string
    subjectKeyIDString: string
}
