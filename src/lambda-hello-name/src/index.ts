import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from "aws-lambda"

const {AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: CONFIG} = process.env

export const handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
    const queries = event.queryStringParameters
    let name = 'there'
    console.log('getting app config')
    const configuration = await fetch(`http://localhost:2772${CONFIG}`).then((res) => res.json())
    console.log('appconfig - ', configuration)

    if (queries !== null && queries !== undefined) {
        if (queries["name"]) {
            name = queries["name"]
        }
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({body: configuration}),
    }
}
