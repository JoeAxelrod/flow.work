use reqwest;
use serde_json::json;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let base_url = "http://localhost:3001";
    let slug = "my-workflow";
    let key = "s1";
    let instance_id = "550e8400-e29b-41d4-a716-446655440000";

    let body = json!({
        "instanceId": instance_id,
        "data": {
            "message": "test hook data",
            "value": 123
        }
    });

    let uri = format!("{}/api/v1/hook/workflow/{}/station/{}", base_url, slug, key);

    println!("\x1b[36mSending POST request to: {}\x1b[0m", uri);
    println!("\x1b[90mBody: {}\x1b[0m", serde_json::to_string_pretty(&body)?);

    let client = reqwest::Client::new();
    let response = client
        .post(&uri)
        .json(&body)
        .send()
        .await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                let response_body: serde_json::Value = res.json().await?;
                println!("\x1b[32mSuccess! Response:\x1b[0m");
                println!("{}", serde_json::to_string_pretty(&response_body)?);
            } else {
                let status = res.status();
                let error_body = res.text().await.unwrap_or_default();
                println!("\x1b[31mError: HTTP {}\x1b[0m", status);
                if !error_body.is_empty() {
                    println!("\x1b[33mResponse body: {}\x1b[0m", error_body);
                }
            }
        }
        Err(e) => {
            println!("\x1b[31mError: {}\x1b[0m", e);
        }
    }

    Ok(())
}

