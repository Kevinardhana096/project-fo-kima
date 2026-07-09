use std::{env, net::IpAddr};

pub struct Config {
    pub host: IpAddr,
    pub port: u16,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let host = env::var("APP_HOST")
            .unwrap_or_else(|_| "127.0.0.1".to_owned())
            .parse()?;
        let port = env::var("APP_PORT")
            .unwrap_or_else(|_| "8080".to_owned())
            .parse()?;
        let database_url = env::var("DATABASE_URL")?;

        Ok(Self {
            host,
            port,
            database_url,
        })
    }
}
