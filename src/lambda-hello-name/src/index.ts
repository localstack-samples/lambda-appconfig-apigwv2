import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from "aws-lambda"
import {DynamoDBClient} from "@aws-sdk/client-dynamodb"
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    GetCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb"

// Bare-bones DynamoDB Client
const client = new DynamoDBClient({})
// Bare-bones document client
const dynamo = DynamoDBDocumentClient.from(client) // client is DynamoDB client

// Get AppConfig Extension prefetch list that the layer is prefetching.
// Get DDB Table Name
const {AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: CONFIG, DDB_TABLE_NAME: TABLE_NAME} = process.env


export const handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
    const queries = event.queryStringParameters
    let name = 'there'
    console.log('getting app config')
    const configuration = await fetch(`http://localhost:2772${CONFIG}`).then((res) => res.json())
    console.log('appconfig - ', configuration)

    // if (queries !== null && queries !== undefined) {
    //     if (queries["name"]) {
    //         name = queries["name"]
    //     }
    // }
    const item = {
        id: event.requestContext.requestId,
        appconfig: configuration,
    }
    await dynamo.send(
        new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        })
    )

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({body: item}),
    }
}
